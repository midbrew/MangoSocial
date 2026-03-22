import express, { Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import Message from '../models/Message';
import Notification from '../models/Notification';
import { AiService } from '../services/ai.service';
import User from '../models/User';
import { BOT_IDS, isAcceptedFriendship, isBlockedPair } from '../services/friendship.service';
import { createNotification } from '../services/notification.service';
import { trackEvent } from '../services/analytics.service';

const router = express.Router();
const aiService = new AiService();

async function canUsersMessage(userId: string, partnerId: string) {
    if (BOT_IDS.includes(partnerId as any)) return true;
    if (await isBlockedPair(userId, partnerId)) return false;
    return isAcceptedFriendship(userId, partnerId);
}

router.get('/:partnerId', protect, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { partnerId } = req.params;

        const allowed = await canUsersMessage(userId, partnerId);
        if (!allowed) {
            res.status(403).json({ error: 'You can only message accepted Mangoes.' });
            return;
        }

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: partnerId },
                { senderId: partnerId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 });

        await Message.updateMany(
            { senderId: partnerId, receiverId: userId, isRead: false },
            { $set: { isRead: true } }
        );

        await Notification.updateMany(
            { user: userId, type: 'message', 'data.partnerId': partnerId, read: false },
            { $set: { read: true } }
        );

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Server error fetching messages' });
    }
});

router.post('/', protect, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { receiverId, content } = req.body;

        if (!receiverId || !content?.trim()) {
            res.status(400).json({ error: 'receiverId and content are required' });
            return;
        }

        const allowed = await canUsersMessage(userId, receiverId);
        if (!allowed) {
            res.status(403).json({ error: 'You can only message accepted Mangoes.' });
            return;
        }

        const userMessage = await Message.create({
            senderId: userId,
            receiverId,
            content: content.trim()
        });

        await trackEvent('message_sent', userId, { receiverId, isBot: BOT_IDS.includes(receiverId as any) });

        const returnedMessages = [userMessage];

        if (BOT_IDS.includes(receiverId as any)) {
            const history = await Message.find({
                $or: [
                    { senderId: userId, receiverId },
                    { senderId: receiverId, receiverId: userId }
                ]
            }).sort({ createdAt: -1 }).limit(10);

            history.reverse();

            const formattedHistory = history.map((msg) => ({
                role: msg.senderId === receiverId ? 'assistant' : 'user' as any,
                content: msg.content
            }));

            const botName = receiverId === 'bot_kofi' ? 'Kofi' : 'Ama';
            const systemPrompt = `You are ${botName}, a friendly, casual user on the MangoSocial dating and friendship app. Keep replies very short, warm, and text-like.`;
            const aiResponseText = await aiService.generateResponse(systemPrompt, formattedHistory);

            const botMessage = await Message.create({
                senderId: receiverId,
                receiverId: userId,
                content: aiResponseText,
                isRead: false
            });

            returnedMessages.push(botMessage);
        } else {
            const sender = await User.findById(userId).select('profile.name');
            await createNotification({
                userId: receiverId,
                type: 'message',
                title: sender?.profile?.name || 'New message',
                body: content.trim().slice(0, 120),
                relatedId: userId,
                data: { partnerId: userId }
            });
        }

        res.status(201).json(returnedMessages);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Server error sending message' });
    }
});

export default router;
