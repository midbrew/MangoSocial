import { Server, Socket } from 'socket.io';
import User, { IUser } from '../models/User';
import { findBestMatch } from '../services/matching.service';
import mongoose from 'mongoose';
import fs from 'fs';
import Friendship from '../models/Friendship';
import { buildPairQuery, getBlockedPartnerIds } from '../services/friendship.service';
import { createNotification } from '../services/notification.service';
import { trackEvent } from '../services/analytics.service';

function debugLog(msg: string) {
    fs.appendFileSync('/Users/micah/Desktop/MY_APPS/MangoSocial/backend/queue_debug.log', new Date().toISOString() + ' ' + msg + '\n');
}

interface QueueUser {
  socketId: string;
  user: IUser;
}

let waitingQueue: QueueUser[] = [];
// Map of userId -> their current socketId (exported for notification service)
export const connectedUsers: Map<string, string> = new Map();
// Map of userId -> match info
const activeMatches: Map<string, { channelName: string; partnerId: string }> = new Map();
// Map of channelName -> { user1Extended: boolean, user2Extended: boolean }
const channelExtensions: Map<string, Record<string, boolean>> = new Map();
// Map of channelName -> { userId: true/false } for mutual "Let's Mango"
const channelMangoIntents: Map<string, Record<string, boolean>> = new Map();
// Map of userId -> pending bot auto-match timeout
const botTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

export const setupMatchingHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    
    // Handle a user identifying themselves to the socket server
    socket.on('identify', (userId: string) => {
      connectedUsers.set(userId, socket.id);
    });

    socket.on('join-queue', async (data: { userId: string }) => {
      const { userId } = data;
      connectedUsers.set(userId, socket.id);
      
      try {
          debugLog(`join-queue called for userId: ${userId}`);
          if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
              debugLog(`Invalid userId: ${userId}`);
              socket.emit('queue-error', { message: 'Invalid user ID or user not logged in.' });
              return;
          }
          const userDoc = await User.findById(userId);
          if (!userDoc || !userDoc.canMatchHumans) {
              debugLog(`User not found or canMatchHumans is false. canMatchHumans: ${userDoc?.canMatchHumans}`);
              socket.emit('queue-error', { message: 'You must complete AI practice first.' });
              return;
          }
          debugLog(`User doc found. canMatchHumans is true.`);
          await trackEvent('queue_joined', userId);
          
          userDoc.checkDailyReset();
          if (userDoc.dailyConnections.used >= userDoc.getDailyLimit()) {
              socket.emit('queue-error', { message: 'Daily connection limit reached.' });
              return;
          }

          const blockedPartnerIds = await getBlockedPartnerIds(userId);

          // Remove from queue if already there
          waitingQueue = waitingQueue.filter(u => u.user._id.toString() !== userId.toString() && u.user.id !== userId);
          
          // Clear any existing timeout from previous rapid rejoins/strict mode mounts
          const existingTimeout = botTimeouts.get(userId);
          if (existingTimeout) {
              clearTimeout(existingTimeout);
              botTimeouts.delete(userId);
          }

          const eligibleQueue = waitingQueue.filter((queuedUser) => !blockedPartnerIds.includes(queuedUser.user.id));
          const { matchIndex } = findBestMatch(eligibleQueue, userDoc);

          if (matchIndex !== -1) {
            // Match found!
            const partnerQueueUser = eligibleQueue[matchIndex];
            waitingQueue = waitingQueue.filter((queuedUser) => queuedUser.socketId !== partnerQueueUser.socketId);
            
            const partnerDoc = partnerQueueUser.user;
            
            // Deduct daily connections
            userDoc.dailyConnections.used += 1;
            await userDoc.save();
            
            partnerDoc.dailyConnections.used += 1;
            await partnerDoc.save();

            const channelName = `call_${Date.now()}_${userId}`;
            
            // Store session
            activeMatches.set(userId, { channelName, partnerId: partnerDoc.id });
            activeMatches.set(partnerDoc.id, { channelName, partnerId: userId });
            channelExtensions.set(channelName, { [userId]: false, [partnerDoc.id]: false });
            channelMangoIntents.set(channelName, { [userId]: false, [partnerDoc.id]: false });
            
            // Notify both
            socket.emit('match-found', { roomId: channelName, partnerId: partnerDoc.id, uid: userId });
            io.to(partnerQueueUser.socketId).emit('match-found', { roomId: channelName, partnerId: userId, uid: partnerDoc.id });
            await Promise.all([
              trackEvent('human_match_found', userId, { partnerId: partnerDoc.id }),
              trackEvent('human_match_found', partnerDoc.id, { partnerId: userId }),
            ]);
            
          } else {
            waitingQueue.push({ socketId: socket.id, user: userDoc });
            
            debugLog(`User ${userId} pushed to queue. Starting 5s bot match timeout.`);
            // Auto-match with bot after 5 seconds
            const botTimeout = setTimeout(() => {
                debugLog(`5s timeout triggered for ${userId}`);
                // Check if still in queue
                const stillWaiting = waitingQueue.find(u => u.user._id.toString() === userId.toString() || u.user.id === userId);
                debugLog(`stillWaiting ? ${!!stillWaiting} (queue length: ${waitingQueue.length})`);
                if (!stillWaiting) return;
                
                // Remove from queue
                waitingQueue = waitingQueue.filter(u => u.user._id.toString() !== userId.toString() && u.user.id !== userId);
                
                // Pick bot based on user's gender preference or opposite gender
                const userGender = userDoc.profile?.gender;
                const botId = userGender === 'Female' ? 'bot_kofi' : 'bot_ama';
                const botName = botId === 'bot_kofi' ? 'Kofi' : 'Ama';
                
                const channelName = `bot_call_${Date.now()}_${userId}`;
                
                // Store session with bot
                activeMatches.set(userId, { channelName, partnerId: botId });
                
                debugLog(`Auto-matched user ${userId} with bot ${botId}`);
                socket.emit('match-found', { 
                    roomId: channelName, 
                    partnerId: botId, 
                    uid: userId,
                    isBot: true,
                    botName
                });
                void trackEvent('bot_match_found', userId, { botId });
            }, 5000);
            
            // Store timeout so it can be cleared if user leaves queue
            botTimeouts.set(userId, botTimeout);
          }
      } catch (err) {
          console.error(err);
          socket.emit('queue-error', { message: 'Internal server error while joining queue.' });
        }
    });

    socket.on('lets-mango', async (data: { userId: string }) => {
      const match = activeMatches.get(data.userId);
      if (!match || match.partnerId.startsWith('bot_')) return;

      const intents = channelMangoIntents.get(match.channelName);
      if (!intents) return;

      intents[data.userId] = true;

      const partnerSocketId = connectedUsers.get(match.partnerId);

          if (intents[match.partnerId]) {
        try {
          let friendship = await Friendship.findOne(buildPairQuery(data.userId, match.partnerId));

          if (friendship?.status === 'blocked') {
            socket.emit('mango-match-error', { message: 'This connection is unavailable right now.' });
            if (partnerSocketId) {
              io.to(partnerSocketId).emit('mango-match-error', { message: 'This connection is unavailable right now.' });
            }
            return;
          }

          if (!friendship) {
            friendship = new Friendship({
              ...buildPairQuery(data.userId, match.partnerId),
              status: 'accepted',
              initiatorId: data.userId,
              acceptedAt: new Date(),
            });
          } else if (friendship.status !== 'accepted') {
            friendship.status = 'accepted';
            friendship.acceptedAt = new Date();
          }

          await friendship.save();

          await Promise.all([
            createNotification({
              userId: data.userId,
              type: 'match',
              title: "It's a Mango match",
              body: 'You both tapped Let’s Mango. Your chat is ready.',
              relatedId: match.partnerId,
              data: { partnerId: match.partnerId }
            }),
            createNotification({
              userId: match.partnerId,
              type: 'match',
              title: "It's a Mango match",
              body: 'You both tapped Let’s Mango. Your chat is ready.',
              relatedId: data.userId,
              data: { partnerId: data.userId }
            })
          ]);
          await Promise.all([
            trackEvent('mango_match_success', data.userId, { partnerId: match.partnerId }),
            trackEvent('mango_match_success', match.partnerId, { partnerId: data.userId }),
          ]);

          socket.emit('mango-match-success', { partnerId: match.partnerId });
          if (partnerSocketId) {
            io.to(partnerSocketId).emit('mango-match-success', { partnerId: data.userId });
          }
        } catch (error) {
          console.error('Failed to save mango match', error);
          socket.emit('mango-match-error', { message: 'Could not complete your Mango match.' });
          if (partnerSocketId) {
            io.to(partnerSocketId).emit('mango-match-error', { message: 'Could not complete your Mango match.' });
          }
        }
      } else if (partnerSocketId) {
        io.to(partnerSocketId).emit('partner-wants-mango');
      }
    });

    socket.on('force-bot-match', async (data: { userId: string }) => {
        debugLog(`force-bot-match triggered for ${data.userId}`);
        const { userId } = data;
        
        // Ensure user is valid
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return;
        const userDoc = await User.findById(userId);
        if (!userDoc) return;

        // Remove from queue
        waitingQueue = waitingQueue.filter(u => u.user._id.toString() !== userId.toString() && u.user.id !== userId);
        
        // Pick bot based on user's gender preference or opposite gender
        const userGender = userDoc.profile?.gender;
        const botId = userGender === 'Female' ? 'bot_kofi' : 'bot_ama';
        const botName = botId === 'bot_kofi' ? 'Kofi' : 'Ama';
        
        const channelName = `bot_call_${Date.now()}_${userId}`;
        
        // Store session with bot
        activeMatches.set(userId, { channelName, partnerId: botId });
        
        debugLog(`Forced match user ${userId} with bot ${botId}`);
        socket.emit('match-found', { 
            roomId: channelName, 
            partnerId: botId, 
            uid: userId,
            isBot: true,
            botName
        });
        void trackEvent('bot_match_found', userId, { botId, forced: true });
    });

    socket.on('leave-queue', (data: { userId: string }) => {
      debugLog(`leave-queue called for userId: ${data.userId}`);
      waitingQueue = waitingQueue.filter(u => u.user._id.toString() !== data.userId.toString() && u.user.id !== data.userId);
      // Cancel pending bot auto-match
      const timeout = botTimeouts.get(data.userId);
      if (timeout) {
        clearTimeout(timeout);
        botTimeouts.delete(data.userId);
      }
    });

    socket.on('extend-time', (data: { userId: string, isPremium?: boolean }) => {
      const match = activeMatches.get(data.userId);
      if (match) {
        const ext = channelExtensions.get(match.channelName);
        if (ext) {
          ext[data.userId] = true;
          const partnerSocketId = connectedUsers.get(match.partnerId);
          
          if (ext[match.partnerId]) {
            // Both agreed!
            const bonus = data.isPremium ? 120 : 60;
            // Also need to check if partner is premium in a real app to be fair, 
            // but for MVP if either triggers premium extension, both get it
            socket.emit('time-extended', { bonusSeconds: bonus });
            if (partnerSocketId) io.to(partnerSocketId).emit('time-extended', { bonusSeconds: bonus });
            
            // Reset extensions for next time
            ext[data.userId] = false;
            ext[match.partnerId] = false;
          } else {
            // Awaiting partner
            if (partnerSocketId) io.to(partnerSocketId).emit('partner-requested-extension');
          }
        }
      }
    });

    socket.on('leave-call', (data: { userId: string; silent?: boolean }) => {
      const match = activeMatches.get(data.userId);
      if (match) {
        const partnerSocketId = connectedUsers.get(match.partnerId);
        if (partnerSocketId && !data.silent) {
             io.to(partnerSocketId).emit('partner-left');
        }
        activeMatches.delete(data.userId);
        activeMatches.delete(match.partnerId);
        channelExtensions.delete(match.channelName);
        channelMangoIntents.delete(match.channelName);
      }
    });

    socket.on('disconnect', () => {
      // Find userId for this socket
      let disconnectedUserId = '';
      for (const [uid, sid] of connectedUsers.entries()) {
        if (sid === socket.id) {
          disconnectedUserId = uid;
          break;
        }
      }

      if (disconnectedUserId) {
        waitingQueue = waitingQueue.filter(u => u.user._id.toString() !== disconnectedUserId.toString() && u.user.id !== disconnectedUserId);
        connectedUsers.delete(disconnectedUserId);
        
        const match = activeMatches.get(disconnectedUserId);
        if (match) {
          const partnerSocketId = connectedUsers.get(match.partnerId);
          if (partnerSocketId) {
             io.to(partnerSocketId).emit('partner-left');
          }
          activeMatches.delete(disconnectedUserId);
          activeMatches.delete(match.partnerId);
          channelExtensions.delete(match.channelName);
          channelMangoIntents.delete(match.channelName);
        }
      }
    });
  });
};
