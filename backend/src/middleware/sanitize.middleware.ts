import { Request, Response, NextFunction } from 'express';

/**
 * Custom NoSQL injection sanitizer.
 * Replaces express-mongo-sanitize which crashes on newer Express/Node
 * due to req.query being a read-only getter.
 * 
 * Recursively strips keys starting with '$' or containing '.' from
 * req.body and req.params to prevent NoSQL injection attacks.
 */
function sanitize(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
    }

    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
        // Strip keys that start with '$' or contain '.'
        if (key.startsWith('$') || key.includes('.')) {
            continue;
        }
        cleaned[key] = sanitize(obj[key]);
    }
    return cleaned;
}

export function mongoSanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.params) {
        // req.params is writable, safe to reassign
        (req as any).params = sanitize(req.params);
    }
    // Intentionally skip req.query (read-only getter in modern Express)
    next();
}
