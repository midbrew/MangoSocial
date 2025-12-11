import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    phoneNumber: string;
    isVerified: boolean;
    profile: {
        name?: string;
        gender?: 'Male' | 'Female' | 'Non-binary';
        birthdate?: Date;
        starSign?: string;
        bio?: string;
        avatarUrl?: string;
    };
    interests: {
        type: 'predefined' | 'custom';
        value: string;
        category?: string;
    }[];
    matchingPreferences: {
        genderPreference: ('Male' | 'Female' | 'Non-binary')[];
        useStarSignMatching: boolean;
    };
    premiumStatus: {
        isPremium: boolean;
        expiresAt?: Date;
    };
    dailyConnections: {
        used: number;
        resetAt: Date;
    };
    aiSessionsCompleted: number;
    canMatchHumans: boolean;
    reputationScore: number;
    isOnboarded: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    phoneNumber: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
    profile: {
        name: { type: String },
        gender: { type: String, enum: ['Male', 'Female', 'Non-binary'] },
        birthdate: { type: Date },
        starSign: { type: String, enum: [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ]},
        bio: { type: String, maxlength: 500 },
        avatarUrl: { type: String }
    },
    interests: [{
        type: { type: String, enum: ['predefined', 'custom'], required: true },
        value: { type: String, required: true },
        category: { type: String }
    }],
    matchingPreferences: {
        genderPreference: [{ type: String, enum: ['Male', 'Female', 'Non-binary'] }],
        useStarSignMatching: { type: Boolean, default: false }
    },
    premiumStatus: {
        isPremium: { type: Boolean, default: false },
        expiresAt: { type: Date }
    },
    dailyConnections: {
        used: { type: Number, default: 0 },
        resetAt: { type: Date, default: Date.now }
    },
    aiSessionsCompleted: { type: Number, default: 0 },
    canMatchHumans: { type: Boolean, default: false },
    reputationScore: { type: Number, default: 100 },
    isOnboarded: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Helper method to check if daily connections should reset
UserSchema.methods.checkDailyReset = function() {
    const now = new Date();
    const resetAt = new Date(this.dailyConnections.resetAt);
    
    // Reset if it's a new day
    if (now.toDateString() !== resetAt.toDateString()) {
        this.dailyConnections.used = 0;
        this.dailyConnections.resetAt = now;
    }
};

// Helper to get daily connection limit based on premium status
UserSchema.methods.getDailyLimit = function(): number {
    return this.premiumStatus.isPremium ? 999 : 10; // Unlimited for premium (999), 10 for free
};

export default mongoose.model<IUser>('User', UserSchema);
