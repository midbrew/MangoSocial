import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import axios from 'axios';

export default function LoginPage() {
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await axios.post('http://localhost:3001/auth/send-otp', {
                phone
            });

            // Navigate to verify page
            navigate('/verify', { state: { phone } });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
            >
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Phone className="w-8 h-8 text-orange-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Welcome to Mango</h1>
                    <p className="text-gray-500">Enter your phone number to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="text-lg text-center tracking-wider"
                            required
                        />
                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                        Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </form>

                <p className="text-xs text-center text-gray-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </motion.div>
        </div>
    );
}
