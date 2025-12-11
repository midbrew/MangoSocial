import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import axios from 'axios';

export default function VerifyPage() {
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const phone = location.state?.phone || 'your number';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:3001/auth/verify-otp', {
                phone,
                otp
            });

            const { token, user } = response.data;

            // Store token in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Navigate based on profile completion
            if (user.isProfileComplete) {
                navigate('/');
            } else {
                navigate('/profile-setup');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Verification failed. Please try again.');
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
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Verify Code</h1>
                    <p className="text-gray-500">We sent a code to {phone}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="text-2xl text-center tracking-[1em] font-mono"
                            maxLength={6}
                            required
                        />
                        {error && (
                            <p className="text-sm text-red-500 text-center">{error}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                        Verify & Continue <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </form>

                <button className="w-full text-sm text-orange-500 font-medium hover:text-orange-600">
                    Resend Code
                </button>
            </motion.div>
        </div>
    );
}
