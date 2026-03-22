import express from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import Friendship from '../models/Friendship';
import Report from '../models/Report';
import User from '../models/User';
import { buildPairQuery, createFriendshipPayload, findFriendshipBetween } from '../services/friendship.service';
import { createNotification } from '../services/notification.service';
import { trackEvent } from '../services/analytics.service';

const router = express.Router();

router.get('/', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const friendships = await Friendship.find({
            $or: [{ user1Id: userId }, { user2Id: userId }],
            status: { $in: ['pending', 'accepted'] }
        }).sort({ updatedAt: -1 });

        res.json(friendships.map((friendship) => createFriendshipPayload(friendship, userId)));
    } catch (error) {
        console.error('Failed to fetch connections', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/request', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { targetUserId } = req.body;

        if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });
        if (userId === targetUserId) return res.status(400).json({ message: 'Cannot friend yourself' });

        const existing = await findFriendshipBetween(userId, targetUserId);
        if (existing?.status === 'blocked') {
            return res.status(403).json({ message: 'This connection is unavailable' });
        }
        if (existing?.status === 'accepted') {
            return res.status(400).json({ message: 'Connection already exists' });
        }
        if (existing?.status === 'pending') {
            if (existing.initiatorId === userId) {
                return res.status(400).json({ message: 'Friend request already sent' });
            }

            existing.status = 'accepted';
            existing.acceptedAt = new Date();
            await existing.save();

            await Promise.all([
                createNotification({
                    userId: targetUserId,
                    type: 'friend_accepted',
                    title: 'You are Mangoes now',
                    body: 'Your friend request was accepted.',
                    relatedId: userId,
                    data: { partnerId: userId }
                }),
                createNotification({
                    userId,
                    type: 'friend_accepted',
                    title: 'Friend request accepted',
                    body: 'You are now connected and can start chatting.',
                    relatedId: targetUserId,
                    data: { partnerId: targetUserId }
                })
            ]);

            return res.status(200).json(createFriendshipPayload(existing, userId));
        }

        const friendship = await Friendship.create({
            ...buildPairQuery(userId, targetUserId),
            status: 'pending',
            initiatorId: userId,
        });

        await createNotification({
            userId: targetUserId,
            type: 'friend_request',
            title: 'New Mango request',
            body: 'Someone wants to connect with you.',
            relatedId: userId,
            data: { partnerId: userId, friendshipId: friendship._id.toString() }
        });

        await trackEvent('friend_request_sent', userId, { targetUserId });

        res.status(201).json(createFriendshipPayload(friendship, userId));
    } catch (error) {
        console.error('Failed to create connection request', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/accept/:id', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const friendship = await Friendship.findById(req.params.id);

        if (!friendship) return res.status(404).json({ message: 'Not found' });
        if (friendship.status !== 'pending') return res.status(400).json({ message: 'Request is no longer pending' });
        if (![friendship.user1Id, friendship.user2Id].includes(userId)) return res.status(403).json({ message: 'Not authorized' });
        if (friendship.initiatorId === userId) return res.status(400).json({ message: 'Cannot accept your own request' });

        friendship.status = 'accepted';
        friendship.acceptedAt = new Date();
        await friendship.save();

        const partnerId = friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id;

        await Promise.all([
            createNotification({
                userId: partnerId,
                type: 'friend_accepted',
                title: 'Your Mango request was accepted',
                body: 'You are now connected and can start chatting.',
                relatedId: userId,
                data: { partnerId: userId }
            }),
            createNotification({
                userId,
                type: 'friend_accepted',
                title: 'You are Mangoes now',
                body: 'The connection is mutual now.',
                relatedId: partnerId,
                data: { partnerId }
            })
        ]);

        await trackEvent('friend_request_accepted', userId, { partnerId });

        res.json(createFriendshipPayload(friendship, userId));
    } catch (error) {
        console.error('Failed to accept connection', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/block/:id', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const targetUserId = req.params.id;

        let friendship = await findFriendshipBetween(userId, targetUserId);
        if (!friendship) {
            friendship = new Friendship({
                ...buildPairQuery(userId, targetUserId),
                initiatorId: userId,
            });
        }

        friendship.status = 'blocked';
        friendship.initiatorId = userId;
        await friendship.save();

        await trackEvent('user_blocked', userId, { targetUserId });

        res.json(createFriendshipPayload(friendship, userId));
    } catch (error) {
        console.error('Failed to block user', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/report', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { targetUserId, reason, description } = req.body;

        if (!targetUserId || !reason) {
            return res.status(400).json({ message: 'targetUserId and reason are required' });
        }

        const report = await Report.create({
            reporter: userId,
            reportedUser: targetUserId,
            reason,
            description,
        });

        let friendship = await findFriendshipBetween(userId, targetUserId);
        if (!friendship) {
            friendship = new Friendship({
                ...buildPairQuery(userId, targetUserId),
                initiatorId: userId,
            });
        }

        friendship.status = 'blocked';
        friendship.initiatorId = userId;
        await friendship.save();

        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
            targetUser.reputationScore = Math.max(0, targetUser.reputationScore - 5);
            if (targetUser.reputationScore < 50) {
                targetUser.canMatchHumans = false;
            }
            await targetUser.save();
        }

        await trackEvent('user_reported', userId, { targetUserId, reason });

        res.json({ message: 'User reported and blocked successfully', report });
    } catch (error) {
        console.error('Report error', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/unblock/:id', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const targetUserId = req.params.id;

        const friendship = await findFriendshipBetween(userId, targetUserId);
        if (!friendship || friendship.status !== 'blocked') {
            return res.status(404).json({ message: 'No active block found' });
        }

        // Only the person who initiated the block can unblock
        if (friendship.initiatorId !== userId) {
            return res.status(403).json({ message: 'Only the blocking user can unblock' });
        }

        // Set to rejected so neither sees the other, but they can re-request
        friendship.status = 'rejected';
        await friendship.save();

        await trackEvent('user_unblocked', userId, { targetUserId });

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Failed to unblock user', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:id', protect, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const friendship = await Friendship.findById(req.params.id);

        if (!friendship) return res.status(404).json({ message: 'Connection not found' });
        if (![friendship.user1Id, friendship.user2Id].includes(userId)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Friendship.findByIdAndDelete(req.params.id);
        res.json({ message: 'Connection removed' });
    } catch (error) {
        console.error('Failed to remove connection', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
