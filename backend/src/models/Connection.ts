import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
    senderId: mongoose.Types.ObjectId | string;
    text: string;
    imageUrl?: string;
    timestamp: Date;
}

export interface IConnection extends Document {
    users: mongoose.Types.ObjectId[];
    status: 'pending' | 'accepted' | 'blocked';
    actionUserId: mongoose.Types.ObjectId; // The user who initiated the request or block
    messages: IMessage[];
    lastReadBy: Map<string, Date>;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    imageUrl: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const ConnectionSchema: Schema = new Schema({
    users: { 
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        validate: [(v: mongoose.Types.ObjectId[]) => v.length === 2, 'Connection must involve exactly two users']
    },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
    actionUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [MessageSchema],
    lastReadBy: { type: Map, of: Date, default: {} }
}, {
    timestamps: true
});

export default mongoose.model<IConnection>('Connection', ConnectionSchema);
