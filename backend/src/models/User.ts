import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    phoneNumber: string;
    isVerified: boolean;
    profile: {
        name?: string;
        gender?: string;
        birthdate?: Date;
        bio?: string;
        avatarUrl?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    phoneNumber: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    profile: {
        name: { type: String },
        gender: { type: String },
        birthdate: { type: Date },
        bio: { type: String },
        avatarUrl: { type: String }
    }
}, {
    timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
