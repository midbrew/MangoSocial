import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, RotateCcw, Home, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEffect, useState } from 'react';

export default function PostCallPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [becameMangoes, setBecameMangoes] = useState(false);

    // Get call data from location state or sessionStorage
    const callData = (location.state as any) || {
        partnerId: sessionStorage.getItem('partner_id'),
        partnerName: sessionStorage.getItem('partner_name') || 'Your Match',
        duration: parseInt(sessionStorage.getItem('call_duration') || '0'),
        friendRequestSent: sessionStorage.getItem('friend_request_sent') === 'true',
    };

    useEffect(() => {
        setBecameMangoes(callData.friendRequestSent);
    }, []);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md w-full space-y-6"
            >
                <div className="space-y-6">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-3xl">{becameMangoes ? '🥭' : '👋'}</span>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            {becameMangoes ? "You're Mangoes!" : 'Call Ended'}
                        </h1>
                        <p className="text-gray-500">
                            {becameMangoes
                                ? <>You and <strong>{callData.partnerName}</strong> matched during the call.</>
                                : <>You chatted with <strong>{callData.partnerName}</strong>.</>}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 inline-flex items-center gap-3">
                        <Clock className="w-5 h-5 text-orange-500" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {formatDuration(callData.duration)}
                            </p>
                            <p className="text-xs text-gray-500">Call duration</p>
                        </div>
                    </div>

                    {!becameMangoes && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                            <p className="text-sm text-orange-800">
                                Next time, both of you need to tap <strong>Let&apos;s Mango</strong> in the last 30 seconds to match and open chat.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        {becameMangoes && callData.partnerId && (
                            <Button
                                onClick={() => navigate(`/chat/${callData.partnerId}`)}
                                className="w-full"
                                size="lg"
                            >
                                💬 Open Chat
                            </Button>
                        )}

                        <Button
                            onClick={() => navigate('/queue')}
                            variant="outline"
                            className="w-full"
                            size="lg"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Match Again
                        </Button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 flex items-center justify-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Back to Home
                        </button>
                    </div>

                    {callData.partnerId && (
                        <button
                            onClick={() => navigate(`/profile/${callData.partnerId}`)}
                            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 mx-auto"
                        >
                            <ShieldAlert className="w-3 h-3" />
                            Report this user
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
