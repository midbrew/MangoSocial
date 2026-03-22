import { Router, Request, Response } from 'express';
import User from '../models/User';
import Interest, { PREDEFINED_INTERESTS } from '../models/Interest';
import { protect, AuthRequest } from '../middleware/auth.middleware';
import Friendship from '../models/Friendship';
import Message from '../models/Message';
import Notification from '../models/Notification';
import Report from '../models/Report';
import { trackEvent } from '../services/analytics.service';

function serializeUser(user: any) {
    return {
        id: user._id.toString(),
        _id: user._id.toString(),
        phone: user.phoneNumber,
        profile: user.profile,
        interests: user.interests,
        matchingPreferences: user.matchingPreferences,
        premiumStatus: user.premiumStatus,
        isOnboarded: user.isOnboarded,
        canMatchHumans: user.canMatchHumans,
        aiSessionsCompleted: user.aiSessionsCompleted,
        reputationScore: user.reputationScore,
        isAdmin: !!user.isAdmin,
    };
}

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

        res.json({ user: serializeUser(user) });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all predefined interests (must be above /:id to prevent route collision)
router.get('/interests', async (req: Request, res: Response) => {
    try {
        let interests = await Interest.find({ isActive: true }).sort({ category: 1, name: 1 });
        
        if (interests.length === 0) {
            await Interest.insertMany(PREDEFINED_INTERESTS);
            interests = await Interest.find({ isActive: true }).sort({ category: 1, name: 1 });
        }

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

// Get user profile by ID (protected, requires connection)
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authorized' });
        }

        const targetUserId = req.params.id;
        const myUserId = req.user.id;

        // Check connection
        const conn = await Friendship.findOne({
            $or: [
                { user1Id: myUserId, user2Id: targetUserId },
                { user1Id: targetUserId, user2Id: myUserId }
            ],
            status: 'accepted'
        });

        // Allow viewing own profile or if connected
        if (!conn && targetUserId !== myUserId) {
            return res.status(403).json({ error: 'Profiles are private. You must be connected to view this profile.' });
        }

        const user = await User.findById(targetUserId).select('-__v');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
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
            user: serializeUser(user)
        });
    } catch (error) {
        console.error('Error updating profile:', error);
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
            avatarUrl: user.profile.avatarUrl,
            user: serializeUser(user),
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Toggle Premium Status (Admin Mock)
router.put('/premium/toggle', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.premiumStatus.isPremium = !user.premiumStatus.isPremium;
        await user.save();

        res.json({ 
            message: `Premium status is now ${user.premiumStatus.isPremium ? 'Active' : 'Inactive'}`,
            isPremium: user.premiumStatus.isPremium,
            user: serializeUser(user),
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/me', protect, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authorized' });

        const userId = req.user.id;

        await Promise.all([
            Friendship.deleteMany({ $or: [{ user1Id: userId }, { user2Id: userId }] }),
            Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
            Notification.deleteMany({ user: userId }),
            Report.deleteMany({ $or: [{ reporter: userId }, { reportedUser: userId }] }),
            User.findByIdAndDelete(userId),
        ]);

        await trackEvent('account_deleted', userId);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
