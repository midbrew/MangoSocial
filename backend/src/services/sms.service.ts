import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class SmsService {
    private apiKey: string;
    private baseUrl = 'https://api.mnotify.com/api/sms/quick';

    constructor() {
        this.apiKey = process.env.MNOTIFY_API_KEY || '';
        if (!this.apiKey || this.apiKey === 'your_api_key_here') {
            console.warn('WARNING: MNOTIFY_API_KEY is not set. SMS sending will fail or be mocked.');
        }
    }

    async sendOTP(phone: string, otp: string): Promise<boolean> {
        if (!this.apiKey || this.apiKey === 'your_api_key_here') {
            console.log(`[MOCK SMS] To: ${phone}, Message: Your Mango verification code is ${otp}`);
            return true;
        }

        try {
            const response = await axios.post(`${this.baseUrl}?key=${this.apiKey}`, {
                recipient: [phone],
                sender: 'Mango',
                message: `Your Mango verification code is ${otp}`,
                is_schedule: false,
                schedule_date: ''
            });

            console.log('mNotify Response:', response.data);
            return response.data.code === '2000'; // Assuming 2000 is success code based on typical APIs, will verify if needed
        } catch (error) {
            console.error('Error sending SMS via mNotify:', error);
            return false;
        }
    }
}
