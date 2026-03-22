import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsEvent extends Document {
    event: string;
    userId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>({
    event: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed },
}, {
    timestamps: true,
});

AnalyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export default mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
