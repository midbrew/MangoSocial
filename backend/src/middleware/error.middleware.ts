import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Standardized error handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Determine status code (default to 500)
    const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
    
    // Log the true, dirty error to our secure internal Winston logs
    logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    if (err.stack) {
        logger.error(err.stack);
    }

    // Determine the sanitized message to send to the client
    let userMessage = err.message;
    
    // Auto-mask Mongoose/MongoDB errors (don't leak schema or DB strings!)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        userMessage = 'Resource not found';
    } else if (err.code === 11000) {
        userMessage = 'Duplicate field value entered';
    } else if (err.name === 'ValidationError') {
        userMessage = Object.values(err.errors).map((val: any) => val.message).join(', ');
    } else if (statusCode === 500) {
        userMessage = 'An unexpected server error occurred. Please try again later.';
    }

    // Send the clean error payload explicitly to the client
    res.status(statusCode).json({
        error: userMessage,
        // Only output the stack trace internally on dev, NEVER in prod!
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
