import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import { trackEvent } from '../services/analytics.service';

const router = Router();

router.get('/status', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!.id).select('premiumStatus dailyConnections');
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.checkDailyReset();
        await user.save();

        res.json({
            isPremium: user.premiumStatus.isPremium,
            expiresAt: user.premiumStatus.expiresAt || null,
            dailyLimit: user.getDailyLimit(),
            usedToday: user.dailyConnections.used,
            remainingToday: Math.max(0, user.getDailyLimit() - user.dailyConnections.used),
            benefits: [
                '3 minute opening call',
                '2 minute extensions',
                `${user.getDailyLimit()} daily matches`,
                'Premium badge on profile'
            ]
        });
    } catch (error) {
        console.error('Premium status error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/subscribe', protect, async (req: AuthRequest, res: Response) => {
    try {
        const { plan = 'monthly' } = req.body || {};
        const durationDays = plan === 'yearly' ? 365 : 30;

        const user = await User.findById(req.user!.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const baseDate = user.premiumStatus.expiresAt && user.premiumStatus.expiresAt > new Date()
            ? user.premiumStatus.expiresAt
            : new Date();

        user.premiumStatus.isPremium = true;
        user.premiumStatus.expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        await user.save();

        await trackEvent('premium_subscribed', req.user!.id, { plan, expiresAt: user.premiumStatus.expiresAt });

        res.json({
            message: 'Premium activated',
            isPremium: true,
            expiresAt: user.premiumStatus.expiresAt,
        });
    } catch (error) {
        console.error('Premium subscribe error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/cancel', protect, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user!.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.premiumStatus.isPremium = false;
        user.premiumStatus.expiresAt = undefined;
        await user.save();

        await trackEvent('premium_cancelled', req.user!.id);

        res.json({
            message: 'Premium cancelled',
            isPremium: false,
            expiresAt: null,
        });
    } catch (error) {
        console.error('Premium cancel error', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
