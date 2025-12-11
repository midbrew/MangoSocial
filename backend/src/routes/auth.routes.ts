import { Router, Request, Response } from 'express';
import { SmsService } from '../services/sms.service';
import { OtpService } from '../services/otp.service';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const router = Router();
const smsService = new SmsService();
const otpService = new OtpService();

router.post('/send-otp', async (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    // Basic phone validation
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }

    const otp = otpService.generateOTP();
    otpService.saveOTP(cleanPhone, otp);

    const sent = await smsService.sendOTP(cleanPhone, otp);

    if (sent) {
        res.json({ message: 'OTP sent successfully' });
    } else {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const cleanPhone = phone.replace(/\s/g, '');
    const isValid = otpService.verifyOTP(cleanPhone, otp);

    if (isValid) {
        try {
            let user = await User.findOne({ phoneNumber: cleanPhone });
            let isNewUser = false;

            if (!user) {
                isNewUser = true;
                user = await User.create({
                    phoneNumber: cleanPhone,
                    isVerified: true,
                    interests: [],
                    matchingPreferences: {
                        genderPreference: [],
                        useStarSignMatching: false
                    },
                    premiumStatus: {
                        isPremium: false
                    },
                    dailyConnections: {
                        used: 0,
                        resetAt: new Date()
                    },
                    aiSessionsCompleted: 0,
                    canMatchHumans: false,
                    reputationScore: 100,
                    isOnboarded: false
                });
            } else {
                // Update verification status if needed
                if (!user.isVerified) {
                    user.isVerified = true;
                    await user.save();
                }
            }

            const token = jwt.sign(
                { id: user._id, phone: user.phoneNumber },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '30d' }
            );

            res.json({
                message: 'Verification successful',
                token,
                isNewUser,
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
            console.error(error);
            res.status(500).json({ error: 'Server error during verification' });
        }
    } else {
        res.status(400).json({ error: 'Invalid or expired OTP' });
    }
});

export default router;
