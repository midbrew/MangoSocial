import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-md"
            >
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">🥭</span>
                </div>
                
                <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
                <p className="text-gray-500 mb-8">
                    Oops! This page doesn't exist yet. We're still building it!
                </p>

                <div className="flex flex-col gap-3">
                    <Button onClick={() => navigate('/')} className="w-full" size="lg">
                        <Home className="w-4 h-4 mr-2" />
                        Go Home
                    </Button>
                    <Button 
                        onClick={() => navigate(-1)} 
                        variant="outline" 
                        className="w-full"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
