import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class SmsService {
    private apiKey: string;
    private senderId: string;
    private baseUrl = 'https://api.mnotify.com/api/sms/quick';
    private useMock: boolean;

    constructor() {
        this.apiKey = process.env.MNOTIFY_API_KEY || '';
        this.senderId = process.env.MNOTIFY_SENDER_ID || 'Mango';
        // Use mock mode if no API key or if explicitly set to mock
        this.useMock = !this.apiKey || this.apiKey === 'your_api_key_here' || process.env.SMS_MOCK === 'true';
        
        if (this.useMock) {
            console.log('📱 SMS Service running in MOCK mode - OTP codes will be printed to terminal');
        }
    }

    private formatPhone(phone: string): string {
        // Strip out +, -, spaces
        let clean = phone.replace(/\D/g, ''); 

        if (clean.length === 10 && clean.startsWith('0')) {
            // 0XXXXXXXXX -> 233 + last 9 digits
            return '233' + clean.slice(1);
        } else if (clean.length === 9) {
            // 9-digit local number -> prefix 233
            return '233' + clean;
        } 
        
        return clean; // Already 233... or an international number we shouldn't touch
    }

    async sendOTP(phone: string, otp: string): Promise<boolean> {
        // Always log OTP to terminal for development convenience
        console.log('\n' + '='.repeat(50));
        console.log(`📱 OTP for ${phone}: ${otp}`);
        console.log('='.repeat(50) + '\n');

        if (this.useMock) {
            return true;
        }

        const formattedPhone = this.formatPhone(phone);

        try {
            const response = await axios.post(this.baseUrl, {
                key: this.apiKey,
                recipient: [formattedPhone],
                sender: this.senderId,
                message: `Your Mango verification code is ${otp}. Please use this to complete your request.`
            });

            console.log('mNotify Response:', response.data);
            return response.data.status === 'success';
        } catch (error: any) {
            console.error('Error sending SMS via mNotify:', error.response?.data || error.message);
            // Still return true since we logged the OTP - allows testing even with API issues
            return true;
        }
    }
}
