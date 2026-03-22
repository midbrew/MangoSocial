import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
    reporter: mongoose.Types.ObjectId;
    reportedUser: mongoose.Types.ObjectId;
    reason: string;
    description?: string;
    status: 'pending' | 'reviewed' | 'resolved';
    createdAt: Date;
    updatedAt: Date;
}

const ReportSchema: Schema = new Schema({
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, enum: ['spam', 'harassment', 'inappropriate', 'other'] },
    description: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' }
}, {
    timestamps: true
});

export default mongoose.model<IReport>('Report', ReportSchema);
