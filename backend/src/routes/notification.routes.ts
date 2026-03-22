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

export default router;
