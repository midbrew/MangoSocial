import mongoose, { Schema, Document } from 'mongoose';

export interface IInterest extends Document {
    category: string;
    name: string;
    emoji: string;
    isActive: boolean;
}

const InterestSchema: Schema = new Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    emoji: { type: String, required: true },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Compound index for unique interests per category
InterestSchema.index({ category: 1, name: 1 }, { unique: true });

export default mongoose.model<IInterest>('Interest', InterestSchema);

// Seed data for predefined interests
export const PREDEFINED_INTERESTS = [
    // Music
    { category: 'Music', name: 'Pop', emoji: '🎤' },
    { category: 'Music', name: 'Hip Hop', emoji: '🎧' },
    { category: 'Music', name: 'R&B', emoji: '🎵' },
    { category: 'Music', name: 'Rock', emoji: '🎸' },
    { category: 'Music', name: 'Jazz', emoji: '🎷' },
    { category: 'Music', name: 'Classical', emoji: '🎻' },
    { category: 'Music', name: 'Afrobeats', emoji: '🥁' },
    { category: 'Music', name: 'Gospel', emoji: '🙏' },
    
    // Sports
    { category: 'Sports', name: 'Football', emoji: '⚽' },
    { category: 'Sports', name: 'Basketball', emoji: '🏀' },
    { category: 'Sports', name: 'Tennis', emoji: '🎾' },
    { category: 'Sports', name: 'Swimming', emoji: '🏊' },
    { category: 'Sports', name: 'Running', emoji: '🏃' },
    { category: 'Sports', name: 'Gym', emoji: '💪' },
    { category: 'Sports', name: 'Yoga', emoji: '🧘' },
    
    // Entertainment
    { category: 'Entertainment', name: 'Movies', emoji: '🎬' },
    { category: 'Entertainment', name: 'TV Shows', emoji: '📺' },
    { category: 'Entertainment', name: 'Anime', emoji: '🎌' },
    { category: 'Entertainment', name: 'Gaming', emoji: '🎮' },
    { category: 'Entertainment', name: 'Reading', emoji: '📚' },
    { category: 'Entertainment', name: 'Comedy', emoji: '😂' },
    
    // Lifestyle
    { category: 'Lifestyle', name: 'Travel', emoji: '✈️' },
    { category: 'Lifestyle', name: 'Food', emoji: '🍕' },
    { category: 'Lifestyle', name: 'Cooking', emoji: '👨‍🍳' },
    { category: 'Lifestyle', name: 'Fashion', emoji: '👗' },
    { category: 'Lifestyle', name: 'Photography', emoji: '📷' },
    { category: 'Lifestyle', name: 'Art', emoji: '🎨' },
    { category: 'Lifestyle', name: 'Nature', emoji: '🌿' },
    
    // Tech & Career
    { category: 'Tech & Career', name: 'Technology', emoji: '💻' },
    { category: 'Tech & Career', name: 'Startups', emoji: '🚀' },
    { category: 'Tech & Career', name: 'Finance', emoji: '💰' },
    { category: 'Tech & Career', name: 'Science', emoji: '🔬' },
    { category: 'Tech & Career', name: 'Entrepreneurship', emoji: '💼' },
    
    // Social
    { category: 'Social', name: 'Deep Conversations', emoji: '💭' },
    { category: 'Social', name: 'Making Friends', emoji: '🤝' },
    { category: 'Social', name: 'Networking', emoji: '🌐' },
    { category: 'Social', name: 'Dating', emoji: '❤️' },
    { category: 'Social', name: 'Language Exchange', emoji: '🗣️' },
];
