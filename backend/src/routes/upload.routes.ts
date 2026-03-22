import express, { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config with validation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `chat-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    },
});

// Upload image for chat
router.post('/image', protect, upload.single('image'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });
        if (!req.file) return res.status(400).json({ error: 'No image provided' });

        // Build the public URL
        const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
        const imageUrl = `${API_URL}/uploads/${req.file.filename}`;

        res.json({ imageUrl, filename: req.file.filename });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Error handler for multer
router.use((err: any, _req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image must be under 5MB' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err.message?.includes('Only JPEG')) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

export default router;
