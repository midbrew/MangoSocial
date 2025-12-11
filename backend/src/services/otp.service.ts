export class OtpService {
    private otpStore: Map<string, { code: string; expiresAt: number }>;

    constructor() {
        this.otpStore = new Map();
    }

    generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    saveOTP(phone: string, code: string) {
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        this.otpStore.set(phone, { code, expiresAt });
    }

    verifyOTP(phone: string, code: string): boolean {
        const record = this.otpStore.get(phone);
        if (!record) return false;

        if (Date.now() > record.expiresAt) {
            this.otpStore.delete(phone);
            return false;
        }

        if (record.code === code) {
            this.otpStore.delete(phone);
            return true;
        }

        return false;
    }
}
