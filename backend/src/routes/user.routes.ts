import { Router, Request, Response } from 'express';
import User from '../models/User';
import Interest, { PREDEFINED_INTERESTS } from '../models/Interest';
import { protect, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get current user profile
router.get('/me', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const user = await User.findById(req.user.id).select('-__v');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user profile
router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const { name, gender, birthdate, starSign, bio, interests, matchingPreferences } = req.body;

        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update profile fields
        if (name !== undefined) user.profile.name = name;
        if (gender !== undefined) user.profile.gender = gender;
        if (birthdate !== undefined) user.profile.birthdate = new Date(birthdate);
        if (starSign !== undefined) user.profile.starSign = starSign;
        if (bio !== undefined) user.profile.bio = bio;

        // Update interests
        if (interests !== undefined) {
            user.interests = interests;
        }

        // Update matching preferences
        if (matchingPreferences !== undefined) {
            user.matchingPreferences = {
                ...user.matchingPreferences,
                ...matchingPreferences
            };
        }

        // Check if onboarding is complete (has name, gender, and at least 3 interests)
        const hasRequiredFields = user.profile.name && user.profile.gender && user.interests.length >= 3;
        if (hasRequiredFields && !user.isOnboarded) {
            user.isOnboarded = true;
        }

        await user.save();

        res.json({ 
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                phone: user.phoneNumber,
                profile: user.profile,
                interests: user.interests,
                matchingPreferences: user.matchingPreferences,
                isOnboarded: user.isOnboarded,
                canMatchHumans: user.canMatchHumans,
                aiSessionsCompleted: user.aiSessionsCompleted
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all predefined interests
router.get('/interests', async (req: Request, res: Response) => {
    try {
        // Try to get from database first
        let interests = await Interest.find({ isActive: true }).sort({ category: 1, name: 1 });
        
        // If no interests in DB, seed them
        if (interests.length === 0) {
            await Interest.insertMany(PREDEFINED_INTERESTS);
            interests = await Interest.find({ isActive: true }).sort({ category: 1, name: 1 });
        }

        // Group by category
        const grouped = interests.reduce((acc, interest) => {
            if (!acc[interest.category]) {
                acc[interest.category] = [];
            }
            acc[interest.category].push({
                id: interest._id,
                name: interest.name,
                emoji: interest.emoji
            });
            return acc;
        }, {} as Record<string, any[]>);

        res.json({ interests: grouped });
    } catch (error) {
        console.error('Error fetching interests:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update avatar URL
router.put('/avatar', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            return res.status(400).json({ error: 'Avatar URL is required' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 'profile.avatarUrl': avatarUrl },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            message: 'Avatar updated successfully',
            avatarUrl: user.profile.avatarUrl
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
