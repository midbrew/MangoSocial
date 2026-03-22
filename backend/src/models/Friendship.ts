import mongoose, { Document, Schema } from 'mongoose';

export interface IFriendship extends Document {
  user1Id: string; // Using string to support both ObjectId and 'bot_kofi'/'bot_ama'
  user2Id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  initiatorId?: string;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    user1Id: { type: String, required: true, index: true },
    user2Id: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'blocked'],
      default: 'pending',
    },
    initiatorId: { type: String },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index to ensure unique friendships
FriendshipSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });

export default mongoose.model<IFriendship>('Friendship', FriendshipSchema);
