import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { api } from '../../context/AuthContext';

interface Scenario {
    id: string;
    title: string;
    description: string;
    emoji: string;
    isCompleted: boolean;
}

export default function AiPracticePage() {
    const navigate = useNavigate();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [canMatchHumans, setCanMatchHumans] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        try {
            const response = await api.get('/ai/scenarios');
            setScenarios(response.data.scenarios);
            setCompletedCount(response.data.completedCount);
            setCanMatchHumans(response.data.canMatchHumans);
        } catch (error) {
            console.error('Failed to fetch scenarios:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartScenario = (scenarioId: string) => {
        navigate(`/ai-practice/${scenarioId}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-purple-500 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-300 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
            {/* Header */}
            <header className="p-4 flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-white/50 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="font-bold text-lg text-gray-900">AI Practice</h1>
                    <p className="text-sm text-gray-500">{completedCount}/3 completed</p>
                </div>
            </header>

            {/* Progress */}
            <div className="px-6 mb-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedCount / 3) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <main className="px-6 pb-6">
                {/* Info Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">🤖</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-900 mb-1">Practice Makes Perfect</h2>
                            <p className="text-sm text-gray-500">
                                Complete all 3 practice conversations to unlock human matching. 
                                These help you get comfortable with voice conversations!
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Scenarios */}
                <div className="space-y-4">
                    {scenarios.map((scenario, index) => (
                        <motion.div
                            key={scenario.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <button
                                onClick={() => !scenario.isCompleted && handleStartScenario(scenario.id)}
                                disabled={scenario.isCompleted}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                                    scenario.isCompleted
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                                        scenario.isCompleted ? 'bg-green-100' : 'bg-purple-100'
                                    }`}>
                                        {scenario.isCompleted ? (
                                            <Check className="w-6 h-6 text-green-600" />
                                        ) : (
                                            scenario.emoji
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-semibold ${
                                            scenario.isCompleted ? 'text-green-700' : 'text-gray-900'
                                        }`}>
                                            {scenario.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">{scenario.description}</p>
                                    </div>
                                    {scenario.isCompleted ? (
                                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                            Done
                                        </span>
                                    ) : (
                                        <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                                    )}
                                </div>
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Unlock Message */}
                {canMatchHumans ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 text-center"
                    >
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-full font-medium shadow-lg">
                            <Sparkles className="w-5 h-5" />
                            Human Matching Unlocked!
                        </div>
                        <Button
                            onClick={() => navigate('/')}
                            className="w-full mt-4"
                            size="lg"
                        >
                            Start Matching with Real People
                        </Button>
                    </motion.div>
                ) : (
                    <div className="mt-8 text-center">
                        <div className="inline-flex items-center gap-2 text-gray-400 px-4 py-2">
                            <Lock className="w-4 h-4" />
                            <span className="text-sm">Complete all scenarios to unlock human matching</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
