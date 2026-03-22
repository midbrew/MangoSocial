import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import { AiService } from '../services/ai.service';
import AiSession, { AI_PRACTICE_SCENARIOS } from '../models/AiSession';
import ConversationLog from '../models/ConversationLog';
import User from '../models/User';

const router = Router();
const aiService = new AiService();

// Gender-based voice selection
const VOICE_IDS: Record<string, string> = {
    Male: 'pNInz6obpgDQGcFmaJgB',       // Adam – deep, warm male voice
    Female: 'EXAVITQu4vr4xnSDxMaL',      // Bella – warm, friendly female voice
    default: 'pNInz6obpgDQGcFmaJgB',     // Adam – natural conversations (fallback)
};

function getVoiceId(gender?: string): string {
    return (gender && VOICE_IDS[gender]) || VOICE_IDS.default;
}

// Get all practice scenarios
router.get('/scenarios', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get completed scenario IDs for this user
        const completedSessions = await AiSession.find({
            userId: req.user.id,
            status: 'completed'
        }).select('scenarioId');

        const completedIds = completedSessions.map(s => s.scenarioId);

        // Return scenarios with completion status
        const scenarios = AI_PRACTICE_SCENARIOS.map(scenario => ({
            id: scenario.id,
            title: scenario.title,
            description: scenario.description,
            emoji: scenario.emoji,
            isCompleted: completedIds.includes(scenario.id)
        }));

        res.json({
            scenarios,
            completedCount: user.aiSessionsCompleted,
            requiredCount: 3,
            canMatchHumans: user.canMatchHumans
        });
    } catch (error) {
        console.error('Error fetching scenarios:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start a new AI practice session
router.post('/sessions/start', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const { scenarioId } = req.body;

        if (!scenarioId) {
            return res.status(400).json({ error: 'Scenario ID is required' });
        }

        const scenario = AI_PRACTICE_SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        // Check if user already completed this scenario
        const existingCompleted = await AiSession.findOne({
            userId: req.user.id,
            scenarioId,
            status: 'completed'
        });

        if (existingCompleted) {
            return res.status(400).json({ error: 'You have already completed this scenario' });
        }

        // Abandon any active sessions for this scenario
        await AiSession.updateMany(
            { userId: req.user.id, scenarioId, status: 'active' },
            { status: 'abandoned' }
        );

        // Get user for personalization
        const user = await User.findById(req.user.id);
        const userName = user?.profile?.name?.split(' ')[0] || 'there'; // Use first name
        const personalizedPrompt = scenario.systemPrompt.replace(/{userName}/g, userName);

        // Generate initial AI message
        const voiceId = getVoiceId(user?.profile?.gender);
        const initialMessage = await aiService.generateResponse(personalizedPrompt, []);
        const audioBase64 = await aiService.generateAudio(initialMessage, voiceId);

        // Create new session
        const session = await AiSession.create({
            userId: req.user.id,
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            messages: [
                {
                    role: 'assistant',
                    content: initialMessage,
                    timestamp: new Date()
                }
            ],
            status: 'active'
        });

        res.json({
            sessionId: session._id,
            scenario: {
                id: scenario.id,
                title: scenario.title,
                description: scenario.description,
                emoji: scenario.emoji
            },
            messages: session.messages,
            audioBase64
        });
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send a message in an AI practice session
router.post('/sessions/:sessionId/message', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const { sessionId } = req.params;
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const session = await AiSession.findOne({
            _id: sessionId,
            userId: req.user.id,
            status: 'active'
        });

        if (!session) {
            return res.status(404).json({ error: 'Active session not found' });
        }

        const scenario = AI_PRACTICE_SCENARIOS.find(s => s.id === session.scenarioId);
        if (!scenario) {
            return res.status(404).json({ error: 'Scenario not found' });
        }

        // Add user message
        session.messages.push({
            role: 'user',
            content: message.trim(),
            timestamp: new Date()
        });

        // Generate AI response
        const conversationHistory = session.messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Get user for personalization
        const user = await User.findById(req.user.id);
        const userName = user?.profile?.name?.split(' ')[0] || 'there';
        const personalizedPrompt = scenario.systemPrompt.replace(/{userName}/g, userName);

        const aiResponse = await aiService.generateResponse(
            personalizedPrompt,
            conversationHistory
        );

        // Add AI response
        session.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date()
        });

        await session.save();

        // Check if conversation should end (after ~6 user messages)
        const userMessageCount = session.messages.filter(m => m.role === 'user').length;
        const shouldEnd = userMessageCount >= 5;

        // Generate audio for the AI response
        const voiceId = getVoiceId(user?.profile?.gender);
        const audioBase64 = await aiService.generateAudio(aiResponse, voiceId);

        res.json({
            messages: session.messages,
            shouldEnd,
            userMessageCount,
            audioBase64
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Complete an AI practice session
router.post('/sessions/:sessionId/complete', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const { sessionId } = req.params;

        const session = await AiSession.findOne({
            _id: sessionId,
            userId: req.user.id,
            status: 'active'
        });

        if (!session) {
            return res.status(404).json({ error: 'Active session not found' });
        }

        const { completionReason } = req.body; // 'timeout' or 'user_ended'

        // Calculate duration
        const startTime = session.createdAt.getTime();
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        // Mark session as completed
        session.status = 'completed';
        session.duration = duration;
        session.completedAt = new Date();
        await session.save();

        // Get user for logging and stats
        const user = await User.findById(req.user.id);

        // Write conversation log for audit trail
        try {
            await ConversationLog.create({
                type: 'ai_practice',
                participants: [{ userId: req.user.id, displayName: user?.profile?.name }],
                messages: session.messages.map(m => ({
                    senderId: m.role === 'user' ? req.user!.id : 'ai',
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp
                })),
                metadata: {
                    scenarioId: session.scenarioId,
                    scenarioTitle: session.scenarioTitle,
                    aiSessionId: session._id,
                    completionReason: completionReason || 'user_ended'
                },
                duration,
                startedAt: session.createdAt,
                endedAt: new Date()
            });
        } catch (logError) {
            console.error('Failed to create conversation log:', logError);
            // Don't fail the request if logging fails
        }

        // Update user's AI session count
        if (user) {
            // Count unique completed scenarios
            const completedScenarios = await AiSession.distinct('scenarioId', {
                userId: req.user.id,
                status: 'completed'
            });

            user.aiSessionsCompleted = completedScenarios.length;

            // Enable human matching after 3 completed scenarios
            if (completedScenarios.length >= 3 && !user.canMatchHumans) {
                user.canMatchHumans = true;
            }

            await user.save();

            res.json({
                message: 'Session completed successfully!',
                completedCount: user.aiSessionsCompleted,
                canMatchHumans: user.canMatchHumans,
                duration
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error completing session:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get session history
router.get('/sessions', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const sessions = await AiSession.find({ userId: req.user.id })
            .select('scenarioId scenarioTitle status duration completedAt createdAt')
            .sort({ createdAt: -1 });

        res.json({ sessions });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get aggregated progress stats
router.get('/progress', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const userId = req.user.id;

        // All completed sessions
        const completedSessions = await AiSession.find({
            userId,
            status: 'completed'
        }).sort({ completedAt: -1 });

        const totalSessions = completedSessions.length;
        const totalDuration = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const averageDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        // Skill level based on completed count
        let skillLevel = 'beginner';
        if (totalSessions >= 9) skillLevel = 'confident';
        else if (totalSessions >= 5) skillLevel = 'intermediate';
        else if (totalSessions >= 3) skillLevel = 'developing';

        // Per-scenario stats
        const scenarioStats = AI_PRACTICE_SCENARIOS.map(scenario => {
            const scenarioSessions = completedSessions.filter(s => s.scenarioId === scenario.id);
            const bestDuration = scenarioSessions.length > 0
                ? Math.min(...scenarioSessions.map(s => s.duration || Infinity))
                : null;
            return {
                id: scenario.id,
                title: scenario.title,
                emoji: scenario.emoji,
                completed: scenarioSessions.length > 0,
                attempts: scenarioSessions.length,
                bestDuration
            };
        });

        // Recent sessions (last 10)
        const recentSessions = completedSessions.slice(0, 10).map(s => ({
            id: s._id,
            scenarioId: s.scenarioId,
            scenarioTitle: s.scenarioTitle,
            duration: s.duration,
            completedAt: s.completedAt,
            messageCount: s.messages.length
        }));

        const user = await User.findById(userId);

        res.json({
            totalSessions,
            totalDuration,
            averageDuration,
            skillLevel,
            canMatchHumans: user?.canMatchHumans || false,
            scenarioStats,
            recentSessions
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Bot conversation for matching (when no real users in queue)
const BOT_PERSONAS: Record<string, { name: string; gender: string; voiceId: string; prompt: string }> = {
    bot_kofi: {
        name: 'Kofi',
        gender: 'Male',
        voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
        prompt: `You are Kofi, a friendly and warm 24-year-old guy from Accra, Ghana. You're on MangoSocial to meet cool people and have great conversations. You love football, music (Afrobeats, hip-hop), and trying new restaurants. You're laid-back, funny, and genuinely interested in the other person. Keep your responses SHORT (1-2 sentences max), natural, and conversational — like a real voice chat. Never mention you're an AI.`
    },
    bot_ama: {
        name: 'Ama',
        gender: 'Female',
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
        prompt: `You are Ama, a friendly and bubbly 23-year-old woman from Accra, Ghana. You're on MangoSocial to connect with interesting people. You love art, fashion, dancing, and good vibes. You're warm, curious, and love asking questions. Keep your responses SHORT (1-2 sentences max), natural, and conversational — like a real voice chat. Never mention you're an AI.`
    }
};

router.post('/bot-message', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const { botId, message, history } = req.body;
        const persona = BOT_PERSONAS[botId];
        if (!persona) return res.status(400).json({ error: 'Unknown bot' });

        // Build conversation history
        const messages = (history || []).map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        if (message) {
            messages.push({ role: 'user' as const, content: message });
        }

        const aiResponse = await aiService.generateResponse(persona.prompt, messages);
        const audioBase64 = await aiService.generateAudio(aiResponse, persona.voiceId);

        res.json({
            text: aiResponse,
            audioBase64,
            botName: persona.name,
            botGender: persona.gender
        });
    } catch (error) {
        console.error('Bot message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
