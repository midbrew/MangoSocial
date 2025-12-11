import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        phone: string;
    };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; phone: string };
            req.user = decoded;
            return next();
        } catch (error) {
            res.status(401).json({ error: 'Not authorized, token failed' });
            return;
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
        return;
    }
};
