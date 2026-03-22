import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock, Sparkles, Trophy, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { api } from '../../context/AuthContext';

interface Scenario {
    id: string;
    title: string;
    description: string;
    emoji: string;
    isCompleted: boolean;
}

const SKILL_BADGES: Record<string, { label: string; color: string; emoji: string }> = {
    beginner:     { label: 'Beginner',     color: 'from-emerald-400 to-green-500', emoji: '🌱' },
    developing:   { label: 'Developing',   color: 'from-blue-400 to-blue-500',     emoji: '📈' },
    intermediate: { label: 'Intermediate', color: 'from-purple-400 to-purple-600', emoji: '⭐' },
    confident:    { label: 'Confident',    color: 'from-orange-400 to-orange-600', emoji: '🔥' },
};

export default function AiPracticePage() {
    const navigate = useNavigate();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [canMatchHumans, setCanMatchHumans] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [totalDuration, setTotalDuration] = useState(0);
    const [skillLevel, setSkillLevel] = useState('beginner');
    const [totalSessions, setTotalSessions] = useState(0);
    const [avgDuration, setAvgDuration] = useState(0);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [scenariosRes, progressRes] = await Promise.all([
                api.get('/ai/scenarios'),
                api.get('/ai/progress'),
            ]);
            setScenarios(scenariosRes.data.scenarios);
            setCompletedCount(scenariosRes.data.completedCount);
            setCanMatchHumans(scenariosRes.data.canMatchHumans);
            setTotalDuration(progressRes.data.totalDuration);
            setSkillLevel(progressRes.data.skillLevel);
            setTotalSessions(progressRes.data.totalSessions);
            setAvgDuration(progressRes.data.averageDuration);
        } catch (error) {
            console.error('Failed to load AI practice data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-orange-500 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    const badge = SKILL_BADGES[skillLevel] || SKILL_BADGES.beginner;

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
            {/* Header */}
            <header className="p-4 flex items-center gap-4 border-b border-gray-100">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-sm">🥭</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">AI Voice Practice</h1>
                        <p className="text-xs text-gray-500">{completedCount}/3 sessions completed</p>
                    </div>
                </div>
            </header>

            {/* Progress bar */}
            <div className="px-6 pt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedCount / 3) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>
            </div>

            <main className="px-6 pb-8 pt-5 space-y-5 max-w-lg mx-auto">
                {/* Skill Badge */}
                <div className="text-center">
                    <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${badge.color} text-white px-5 py-2 rounded-full shadow text-sm font-semibold`}>
                        <span>{badge.emoji}</span>
                        {badge.label}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                        <Trophy className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                        <p className="text-xl font-bold text-gray-900">{totalSessions}</p>
                        <p className="text-xs text-gray-500">Sessions</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                        <Clock className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                        <p className="text-xl font-bold text-gray-900">{formatDuration(totalDuration)}</p>
                        <p className="text-xs text-gray-500">Total Time</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                        <TrendingUp className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                        <p className="text-xl font-bold text-gray-900">{formatDuration(avgDuration)}</p>
                        <p className="text-xs text-gray-500">Avg Length</p>
                    </div>
                </div>

                {/* Scenarios heading */}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Practice Scenarios</p>

                {/* Scenario Cards */}
                <div className="space-y-3">
                    {scenarios.map((scenario, index) => (
                        <motion.div
                            key={scenario.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                        >
                            <button
                                onClick={() => !scenario.isCompleted && navigate(`/ai-practice/${scenario.id}`)}
                                disabled={scenario.isCompleted}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                                    scenario.isCompleted
                                        ? 'border-green-200 bg-green-50 cursor-default'
                                        : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-md shadow-sm'
                                }`}
                            >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                                    scenario.isCompleted ? 'bg-green-100' : 'bg-orange-50'
                                }`}>
                                    {scenario.isCompleted
                                        ? <Check className="w-6 h-6 text-green-600" />
                                        : scenario.emoji
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold ${scenario.isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                                        {scenario.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate">{scenario.description}</p>
                                </div>
                                {scenario.isCompleted ? (
                                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2.5 py-1 rounded-full flex-shrink-0">Done ✓</span>
                                ) : (
                                    <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full flex-shrink-0">Start →</span>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Unlock Status */}
                {canMatchHumans ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center pt-2 space-y-3"
                    >
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
                            <Sparkles className="w-5 h-5" />
                            Human Matching Unlocked!
                        </div>
                        <Button onClick={() => navigate('/')} className="w-full" size="lg">
                            Start Matching with Real People
                        </Button>
                    </motion.div>
                ) : (
                    <div className="text-center pt-2">
                        <div className="inline-flex items-center gap-2 text-gray-400">
                            <Lock className="w-4 h-4" />
                            <span className="text-sm">Complete all 3 to unlock human matching</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
