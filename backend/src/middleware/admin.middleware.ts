import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from './auth.middleware';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authorized' });
            return;
        }

        const user = await User.findById(req.user.id).select('isAdmin');
        if (!user?.isAdmin) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        next();
    } catch (error) {
        console.error('Admin auth error', error);
        res.status(500).json({ error: 'Server error' });
    }
};
