import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    type: 'friend_request' | 'friend_accepted' | 'match' | 'message';
    title: string;
    body: string;
    read: boolean;
    relatedId?: string;
    data?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['friend_request', 'friend_accepted', 'match', 'message'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedId: { type: String },
    data: { type: Schema.Types.Mixed },
}, {
    timestamps: true
});

// Auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
