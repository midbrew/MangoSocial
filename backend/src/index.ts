import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
// Load environment variables before any other local imports!
dotenv.config();

import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import friendsRoutes from './routes/friends.routes';
import messagesRoutes from './routes/messages.routes';
import aiRoutes from './routes/ai.routes';
import connectionRoutes from './routes/connection.routes';
import notificationRoutes from './routes/notification.routes';
import uploadRoutes from './routes/upload.routes';
import connectDB from './config/db';
import { setupMatchingHandlers } from './socket/matching.handler';
import { setupChatHandlers } from './socket/chat.handler';
import { errorHandler } from './middleware/error.middleware';
import { mongoSanitizeMiddleware } from './middleware/sanitize.middleware';
import { stream } from './utils/logger';

connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev, restrict in prod
        methods: ["GET", "POST"]
    }
});

// CORS must come first so preflight OPTIONS requests are handled before other middleware
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

app.use(morgan('combined', { stream }));
app.use(helmet()); 
app.use(mongoSanitizeMiddleware);

const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again later.' }
});

// Apply rate limiting to authentication routes
app.use('/auth', apiLimiter);

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/friends', friendsRoutes);
app.use('/messages', messagesRoutes);
app.use('/ai', aiRoutes);
app.use('/connections', connectionRoutes);
app.use('/notifications', notificationRoutes);
app.use('/upload', uploadRoutes);

// Serve uploaded files
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req: Request, res: Response) => {
    res.send('MangoSocial Backend is running');
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

setupMatchingHandlers(io);
setupChatHandlers(io);

// Keep the default connection log just in case
io.on('connection', (socket) => {
    console.log('Global socket connected:', socket.id);
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
