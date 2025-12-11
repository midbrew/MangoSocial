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

    const otp = otpService.generateOTP();
    otpService.saveOTP(phone, otp);

    const sent = await smsService.sendOTP(phone, otp);

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

    const isValid = otpService.verifyOTP(phone, otp);

    if (isValid) {
        try {
            let user = await User.findOne({ phoneNumber: phone });

            if (!user) {
                user = await User.create({
                    phoneNumber: phone,
                    isVerified: true
                });
            }

            const token = jwt.sign(
                { id: user._id, phone: user.phoneNumber },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '30d' }
            );

            res.json({
                message: 'Verification successful',
                token,
                user: {
                    id: user._id,
                    phone: user.phoneNumber,
                    isProfileComplete: !!user.profile?.name
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
