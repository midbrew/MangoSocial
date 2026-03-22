import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationLog extends Document {
    type: 'ai_practice' | 'human_call';
    participants: {
        userId: mongoose.Types.ObjectId;
        displayName?: string;
    }[];
    messages: {
        senderId: string; // ObjectId string or 'ai'
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
    }[];
    metadata: {
        scenarioId?: string;
        scenarioTitle?: string;
        aiSessionId?: mongoose.Types.ObjectId;
        completionReason?: 'timeout' | 'user_ended' | 'abandoned';
    };
    duration: number; // seconds
    startedAt: Date;
    endedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationLogSchema: Schema = new Schema({
    type: {
        type: String,
        enum: ['ai_practice', 'human_call'],
        required: true
    },
    participants: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        displayName: { type: String }
    }],
    messages: [{
        senderId: { type: String, required: true },
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    metadata: {
        scenarioId: { type: String },
        scenarioTitle: { type: String },
        aiSessionId: { type: Schema.Types.ObjectId, ref: 'AiSession' },
        completionReason: { type: String, enum: ['timeout', 'user_ended', 'abandoned'] }
    },
    duration: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date }
}, {
    timestamps: true
});

// Index for efficient queries
ConversationLogSchema.index({ 'participants.userId': 1, createdAt: -1 });
ConversationLogSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model<IConversationLog>('ConversationLog', ConversationLogSchema);
