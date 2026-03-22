import { Router, Request, Response } from 'express';
import { SmsService } from '../services/sms.service';
import { OtpService } from '../services/otp.service';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate.middleware';
import { sendOtpSchema, verifyOtpSchema } from '../schemas/auth.schema';

const router = Router();
const smsService = new SmsService();
const otpService = new OtpService();

router.post('/send-otp', validate(sendOtpSchema), async (req: Request, res: Response) => {
    const { phone } = req.body;

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

router.post('/verify-otp', validate(verifyOtpSchema), async (req: Request, res: Response) => {
    const { phone, otp } = req.body;

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
                    isOnboarded: false,
                    agreedToTermsAt: new Date()
                });
            } else {
                // Update verification status if needed
                if (!user.isVerified) {
                    user.isVerified = true;
                    await user.save();
                }
            }

            const accessToken = jwt.sign(
                { id: user._id, phone: user.phoneNumber },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '15m' }
            );

            const refreshToken = jwt.sign(
                { id: user._id },
                process.env.REFRESH_TOKEN_SECRET || 'refresh_secret',
                { expiresIn: '7d' }
            );

            res.cookie('jwt', refreshToken, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'strict', 
                maxAge: 7 * 24 * 60 * 60 * 1000 
            });

            res.json({
                message: 'Verification successful',
                token: accessToken,
                isNewUser,
                user: {
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

router.post('/refresh', (req: Request, res: Response) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.status(401).json({ error: 'Unauthorized' });
    
    const refreshToken = cookies.jwt;

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret') as { id: string, phone?: string };
        const accessToken = jwt.sign(
            { id: decoded.id, phone: decoded.phone },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '15m' }
        );
        res.json({ token: accessToken });
    } catch (e) {
        return res.status(403).json({ error: 'Forbidden' });
    }
});

router.post('/logout', (req: Request, res: Response) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204);
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Cookie cleared, successfully logged out' });
});

export default router;
