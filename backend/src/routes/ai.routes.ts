import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import { AiService } from '../services/ai.service';
import AiSession, { AI_PRACTICE_SCENARIOS } from '../models/AiSession';
import User from '../models/User';

const router = Router();
const aiService = new AiService();

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

        // Generate initial AI message
        const initialMessage = await aiService.generateResponse(scenario.systemPrompt, []);

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
            messages: session.messages
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

        const aiResponse = await aiService.generateResponse(
            scenario.systemPrompt,
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

        res.json({
            messages: session.messages,
            shouldEnd,
            userMessageCount
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

        // Check minimum messages (user should have sent at least 3 messages)
        const userMessageCount = session.messages.filter(m => m.role === 'user').length;
        if (userMessageCount < 3) {
            return res.status(400).json({ 
                error: 'Please have a longer conversation before completing (at least 3 messages)' 
            });
        }

        // Calculate duration
        const startTime = session.createdAt.getTime();
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        // Mark session as completed
        session.status = 'completed';
        session.duration = duration;
        session.completedAt = new Date();
        await session.save();

        // Update user's AI session count
        const user = await User.findById(req.user.id);
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

export default router;
