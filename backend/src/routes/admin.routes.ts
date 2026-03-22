import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import Report from '../models/Report';
import User from '../models/User';
import Friendship from '../models/Friendship';
import Message from '../models/Message';
import Notification from '../models/Notification';
import { getAnalyticsSummary, trackEvent } from '../services/analytics.service';

const router = Router();

router.use(protect, requireAdmin);

router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
    try {
        const [userCount, premiumCount, friendshipCount, messageCount, openReports, analytics] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ 'premiumStatus.isPremium': true }),
            Friendship.countDocuments({ status: 'accepted' }),
            Message.countDocuments(),
            Report.countDocuments({ status: 'pending' }),
            getAnalyticsSummary(30),
        ]);

        res.json({
            overview: {
                users: userCount,
                premiumUsers: premiumCount,
                acceptedFriendships: friendshipCount,
                messages: messageCount,
                openReports,
            },
            analytics,
        });
    } catch (error) {
        console.error('Admin dashboard error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/reports', async (_req: AuthRequest, res: Response) => {
    try {
        const reports = await Report.find()
            .populate('reporter', 'profile.name phoneNumber')
            .populate('reportedUser', 'profile.name phoneNumber reputationScore')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(reports);
    } catch (error) {
        console.error('Admin reports error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/reports/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.body;
        if (!['pending', 'reviewed', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid report status' });
        }

        const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!report) return res.status(404).json({ error: 'Report not found' });

        await trackEvent('admin_report_updated', req.user!.id, { reportId: report._id.toString(), status });

        res.json(report);
    } catch (error) {
        console.error('Admin report update error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/users', async (_req: AuthRequest, res: Response) => {
    try {
        const users = await User.find()
            .select('profile.name phoneNumber premiumStatus reputationScore canMatchHumans isAdmin createdAt')
            .sort({ createdAt: -1 })
            .limit(100);

        const usersWithUnread = await Promise.all(users.map(async (user) => ({
            id: user._id.toString(),
            name: user.profile?.name || 'Unnamed User',
            phoneNumber: user.phoneNumber,
            isPremium: user.premiumStatus?.isPremium || false,
            reputationScore: user.reputationScore,
            canMatchHumans: user.canMatchHumans,
            isAdmin: user.isAdmin,
            unreadNotifications: await Notification.countDocuments({ user: user._id, read: false }),
            createdAt: user.createdAt,
        })));

        res.json(usersWithUnread);
    } catch (error) {
        console.error('Admin users error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Ban / Unban a user
router.put('/users/:id/ban', async (req: AuthRequest, res: Response) => {
    try {
        const { reason } = req.body || {};
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.canMatchHumans = !user.canMatchHumans;
        await user.save();

        await trackEvent('admin_user_ban_toggled', req.user!.id, {
            targetUserId: req.params.id,
            banned: !user.canMatchHumans,
            reason,
        });

        res.json({
            message: user.canMatchHumans ? 'User unbanned' : 'User banned',
            canMatchHumans: user.canMatchHumans,
        });
    } catch (error) {
        console.error('Admin ban error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle premium status
router.put('/users/:id/premium', async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.premiumStatus.isPremium = !user.premiumStatus.isPremium;
        if (user.premiumStatus.isPremium) {
            user.premiumStatus.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else {
            user.premiumStatus.expiresAt = undefined;
        }
        await user.save();

        await trackEvent('admin_premium_toggled', req.user!.id, {
            targetUserId: req.params.id,
            isPremium: user.premiumStatus.isPremium,
        });

        res.json({
            message: user.premiumStatus.isPremium ? 'Premium activated' : 'Premium removed',
            isPremium: user.premiumStatus.isPremium,
        });
    } catch (error) {
        console.error('Admin premium toggle error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a user account (admin)
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await Promise.all([
            Friendship.deleteMany({ $or: [{ user1Id: userId }, { user2Id: userId }] }),
            Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
            Notification.deleteMany({ user: userId }),
            Report.deleteMany({ $or: [{ reporter: userId }, { reportedUser: userId }] }),
            User.findByIdAndDelete(userId),
        ]);

        await trackEvent('admin_user_deleted', req.user!.id, { targetUserId: userId });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Admin delete user error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Detailed analytics with date range
router.get('/analytics', async (req: AuthRequest, res: Response) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const analytics = await getAnalyticsSummary(days);
        res.json(analytics);
    } catch (error) {
        console.error('Admin analytics error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
