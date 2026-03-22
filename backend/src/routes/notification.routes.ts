import express, { Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import Notification from '../models/Notification';

const router = express.Router();

// Get all notifications for user
router.get('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark one as read
router.put('/:id/read', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { read: true },
            { new: true }
        );

        if (!notif) return res.status(404).json({ error: 'Notification not found' });
        res.json(notif);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark all as read
router.put('/read-all', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete one notification
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const deleted = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!deleted) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all notifications
router.delete('/', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        await Notification.deleteMany({ user: req.user.id });
        res.json({ message: 'All notifications cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
