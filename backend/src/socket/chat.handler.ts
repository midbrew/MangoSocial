import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import { isAcceptedFriendship, isBlockedPair, BOT_IDS } from '../services/friendship.service';

/** Deterministic room ID for two users so both always join the same room. */
function chatRoomId(userA: string, userB: string): string {
  return userA < userB ? `chat_${userA}_${userB}` : `chat_${userB}_${userA}`;
}

export const setupChatHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    socket.on('join-chat', (data: { userId: string; partnerId: string }) => {
      if (!data.userId || !data.partnerId) return;
      const roomId = chatRoomId(data.userId, data.partnerId);
      socket.join(roomId);
    });

    socket.on('leave-chat', (data: { userId: string; partnerId: string }) => {
      if (!data.userId || !data.partnerId) return;
      const roomId = chatRoomId(data.userId, data.partnerId);
      socket.leave(roomId);
    });

    socket.on('send-message', async (data: {
      senderId: string;
      receiverId: string;
      content: string;
    }) => {
      if (!data.senderId || !data.receiverId || !data.content?.trim()) return;

      // Validate relationship
      const isBot = BOT_IDS.includes(data.receiverId as any);
      if (!isBot) {
        if (await isBlockedPair(data.senderId, data.receiverId)) return;
        if (!(await isAcceptedFriendship(data.senderId, data.receiverId))) return;
      }

      try {
        const msg = await Message.create({
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content.trim(),
        });

        const roomId = chatRoomId(data.senderId, data.receiverId);
        io.to(roomId).emit('receive-message', {
          _id: msg._id.toString(),
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          isRead: msg.isRead,
          createdAt: msg.createdAt,
        });
      } catch (err) {
        console.error('socket send-message error', err);
      }
    });

    socket.on('typing', (data: { userId: string; partnerId: string; isTyping: boolean }) => {
      if (!data.userId || !data.partnerId) return;
      const roomId = chatRoomId(data.userId, data.partnerId);
      socket.to(roomId).emit('partner-typing', {
        userId: data.userId,
        isTyping: data.isTyping,
      });
    });

    socket.on('mark-read', async (data: { userId: string; partnerId: string }) => {
      if (!data.userId || !data.partnerId) return;

      try {
        await Message.updateMany(
          { senderId: data.partnerId, receiverId: data.userId, isRead: false },
          { $set: { isRead: true } }
        );
      } catch (err) {
        console.error('socket mark-read error', err);
      }

      const roomId = chatRoomId(data.userId, data.partnerId);
      socket.to(roomId).emit('messages-read', {
        userId: data.userId,
        readAt: new Date(),
      });
    });
  });
};
