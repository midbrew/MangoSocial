import { motion } from 'framer-motion';
import { Phone, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
            {/* Header */}
            <header className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">🥭</span>
                    </div>
                    <span className="font-bold text-xl text-gray-900">Mango</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => navigate('/profile')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <User className="w-5 h-5 text-gray-600" />
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-col items-center justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                >
                    {/* User Greeting */}
                    <div className="mb-8">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            {user?.profile.avatarUrl ? (
                                <img 
                                    src={user.profile.avatarUrl} 
                                    alt="Avatar" 
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-3xl">👋</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            Hey, {user?.profile.name || 'there'}!
                        </h1>
                        <p className="text-gray-500">Ready to meet someone new?</p>
                    </div>

                    {/* AI Sessions Required Notice */}
                    {!user?.canMatchHumans && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6"
                        >
                            <p className="text-amber-800 text-sm">
                                <strong>Complete {3 - (user?.aiSessionsCompleted || 0)} more AI practice sessions</strong> to unlock human matching!
                            </p>
                        </motion.div>
                    )}

                    {/* Main Action Button */}
                    <div className="space-y-4">
                        {user?.canMatchHumans ? (
                            <Button 
                                size="lg" 
                                className="w-full text-lg py-6"
                                onClick={() => navigate('/match')}
                            >
                                <Phone className="w-5 h-5 mr-2" />
                                Start Matching
                            </Button>
                        ) : (
                            <Button 
                                size="lg" 
                                className="w-full text-lg py-6"
                                onClick={() => navigate('/ai-practice')}
                            >
                                🤖 Practice with AI
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <p className="text-2xl font-bold text-orange-500">
                                {user?.aiSessionsCompleted || 0}/3
                            </p>
                            <p className="text-xs text-gray-500">AI Sessions</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <p className="text-2xl font-bold text-orange-500">
                                {user?.interests.length || 0}
                            </p>
                            <p className="text-xs text-gray-500">Interests</p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
