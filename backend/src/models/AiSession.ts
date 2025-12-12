import mongoose, { Schema, Document } from 'mongoose';

export interface IAiSession extends Document {
    userId: mongoose.Types.ObjectId;
    scenarioId: string;
    scenarioTitle: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
    }[];
    status: 'active' | 'completed' | 'abandoned';
    duration: number; // in seconds
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AiSessionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scenarioId: { type: String, required: true },
    scenarioTitle: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    status: { 
        type: String, 
        enum: ['active', 'completed', 'abandoned'], 
        default: 'active' 
    },
    duration: { type: Number, default: 0 },
    completedAt: { type: Date }
}, {
    timestamps: true
});

export default mongoose.model<IAiSession>('AiSession', AiSessionSchema);

// Practice scenarios
export const AI_PRACTICE_SCENARIOS = [
    {
        id: 'casual-intro',
        title: 'Casual Introduction',
        description: 'Practice introducing yourself in a friendly, casual way',
        emoji: '👋',
        systemPrompt: `You are a friendly person on a voice social app called Mango. You're practicing conversations with a new user. 
        
Your personality: Warm, curious, and encouraging. You ask follow-up questions and share a bit about yourself too.

Guidelines:
- Keep responses conversational and brief (1-3 sentences)
- Be genuinely interested in getting to know them
- Share relatable things about yourself when appropriate
- Be encouraging and supportive
- After 5-6 exchanges, naturally wrap up the conversation positively

Start by greeting them warmly and asking how they're doing today.`
    },
    {
        id: 'shared-interests',
        title: 'Finding Common Ground',
        description: 'Practice discovering shared interests with someone new',
        emoji: '🎯',
        systemPrompt: `You are a friendly person on a voice social app called Mango. You're helping a user practice finding common interests.

Your personality: Enthusiastic, relatable, with diverse interests (music, movies, travel, food, sports, tech).

Guidelines:
- Keep responses conversational and brief (1-3 sentences)
- When they mention an interest, show genuine excitement if you share it
- Ask thoughtful follow-up questions about their interests
- Share your own related interests naturally
- Help them feel confident about making connections
- After 5-6 exchanges, naturally wrap up positively

Start by asking what they've been into lately or what they're passionate about.`
    },
    {
        id: 'keeping-conversation',
        title: 'Keeping It Going',
        description: 'Practice maintaining an engaging conversation flow',
        emoji: '💬',
        systemPrompt: `You are a friendly person on a voice social app called Mango. You're helping a user practice keeping conversations engaging.

Your personality: Curious, thoughtful, good at asking interesting questions.

Guidelines:
- Keep responses conversational and brief (1-3 sentences)
- Model good conversation techniques: open-ended questions, active listening, building on what they say
- If they give short answers, gently encourage them with follow-up questions
- Share your own thoughts and experiences to keep things balanced
- Be positive and make them feel heard
- After 5-6 exchanges, wrap up by complimenting their conversation skills

Start with an interesting, open-ended question to get things flowing.`
    }
];
