import express, { Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import Friendship from '../models/Friendship';
import Message from '../models/Message';
import User from '../models/User';
import { BOT_IDS, BOT_PROFILES, buildPairQuery, createFriendshipPayload, findFriendshipBetween } from '../services/friendship.service';
import { createNotification } from '../services/notification.service';
import { trackEvent } from '../services/analytics.service';

const router = express.Router();

async function buildFriendListItem(userId: string, friendship: any) {
    const partnerId = friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id;
    const lastMessage = await Message.findOne({
        $or: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId }
        ]
    }).sort({ createdAt: -1 });

    const unreadCount = await Message.countDocuments({
        senderId: partnerId,
        receiverId: userId,
        isRead: false,
    });

    if (BOT_IDS.includes(partnerId as any)) {
        return {
            ...BOT_PROFILES[partnerId],
            friendshipId: friendship._id.toString(),
            unreadCount,
            lastMessage: lastMessage ? {
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
            } : null,
            lastActivityAt: lastMessage?.createdAt || friendship.updatedAt,
        };
    }

    const user = await User.findById(partnerId).select('profile.name profile.avatarUrl profile.bio profile.gender');
    if (!user) return null;

    const name = user.profile?.name || 'Mango User';
    const avatarUrl = user.profile?.avatarUrl || null;

    return {
        id: partnerId,
        _id: partnerId,
        name,
        displayName: name,
        avatarUrl,
        profileImageUrl: avatarUrl,
        bio: user.profile?.bio || '',
        gender: user.profile?.gender || null,
        isBot: false,
        friendshipId: friendship._id.toString(),
        unreadCount,
        lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
        } : null,
        lastActivityAt: lastMessage?.createdAt || friendship.updatedAt,
    };
}

router.post('/connect', protect, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { targetId } = req.body;
        const userId = req.user!.id;

        if (!targetId) {
            res.status(400).json({ error: 'targetId is required' });
            return;
        }

        if (targetId === userId) {
            res.status(400).json({ error: 'You cannot connect with yourself' });
            return;
        }

        const existing = await findFriendshipBetween(userId, targetId);
        if (existing?.status === 'blocked') {
            res.status(403).json({ error: 'This connection is unavailable' });
            return;
        }

        if (existing?.status === 'accepted') {
            res.status(400).json({ error: 'Friendship already exists' });
            return;
        }

        if (existing?.status === 'pending') {
            if (existing.initiatorId === userId) {
                res.status(400).json({ error: 'Friend request already exists' });
                return;
            }

            existing.status = 'accepted';
            existing.acceptedAt = new Date();
            await existing.save();

            await Promise.all([
                createNotification({
                    userId,
                    type: 'friend_accepted',
                    title: 'You are Mangoes now',
                    body: 'The connection is mutual now.',
                    relatedId: targetId,
                    data: { partnerId: targetId }
                }),
                createNotification({
                    userId: targetId,
                    type: 'friend_accepted',
                    title: 'Your request was accepted',
                    body: 'You can start chatting now.',
                    relatedId: userId,
                    data: { partnerId: userId }
                })
            ]);

            res.status(200).json({
                message: 'Connected successfully',
                friendship: existing
            });
            return;
        }

        const isBot = BOT_IDS.includes(targetId as any);

        const friendship = await Friendship.create({
            ...buildPairQuery(userId, targetId),
            status: isBot ? 'accepted' : 'pending',
            acceptedAt: isBot ? new Date() : undefined,
            initiatorId: userId,
        });

        if (isBot) {
            await createNotification({
                userId,
                type: 'match',
                title: 'Connected with AI Bot',
                body: `You can now keep chatting with ${BOT_PROFILES[targetId].displayName}.`,
                relatedId: targetId,
                data: { partnerId: targetId }
            });
            await trackEvent('bot_connected', userId, { botId: targetId });
        } else {
            await createNotification({
                userId: targetId,
                type: 'friend_request',
                title: 'New Mango request',
                body: 'Someone wants to connect with you.',
                relatedId: userId,
                data: { partnerId: userId, friendshipId: friendship._id.toString() }
            });
            await trackEvent('friend_request_sent', userId, { targetUserId: targetId, source: 'friends_connect' });
        }

        res.status(201).json({
            message: isBot ? 'Connected with AI Bot!' : 'Friend request sent',
            friendship 
        });
    } catch (error) {
        console.error('Error connecting friend:', error);
        res.status(500).json({ error: 'Server error adding friend' });
    }
});

router.get('/requests', protect, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const requests = await Friendship.find({
            status: 'pending',
            $or: [{ user1Id: userId }, { user2Id: userId }]
        }).sort({ updatedAt: -1 });

        const incoming = await Promise.all(
            requests
                .filter((request) => request.initiatorId !== userId)
                .map(async (request) => {
                    const partnerId = request.user1Id === userId ? request.user2Id : request.user1Id;
                    const user = await User.findById(partnerId).select('profile.name profile.avatarUrl');
                    if (!user) return null;

                    return {
                        ...createFriendshipPayload(request, userId),
                        partner: {
                            id: partnerId,
                            name: user.profile?.name || 'Mango User',
                            avatarUrl: user.profile?.avatarUrl || null,
                        }
                    };
                })
        );

        res.json(incoming.filter(Boolean));
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Server error fetching requests' });
    }
});

router.get('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;

        const friendships = await Friendship.find({
            $or: [{ user1Id: userId }, { user2Id: userId }],
            status: 'accepted'
        });

        const friendProfiles = await Promise.all(friendships.map((friendship) => buildFriendListItem(userId, friendship)));

        const sorted = friendProfiles
            .filter((profile) => profile !== null)
            .sort((a: any, b: any) => {
                const aTime = new Date(a.lastActivityAt || 0).getTime();
                const bTime = new Date(b.lastActivityAt || 0).getTime();
                return bTime - aTime;
            });

        res.json(sorted);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Server error fetching friends' });
    }
});

export default router;
