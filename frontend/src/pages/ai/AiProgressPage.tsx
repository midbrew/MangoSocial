import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { api } from '../../context/AuthContext';

interface ScenarioStat {
    id: string;
    title: string;
    emoji: string;
    completed: boolean;
    attempts: number;
    bestDuration: number | null;
}

interface RecentSession {
    id: string;
    scenarioId: string;
    scenarioTitle: string;
    duration: number;
    completedAt: string;
    messageCount: number;
}

const SKILL_BADGES: Record<string, { label: string; color: string; emoji: string }> = {
    beginner: { label: 'Beginner', color: 'from-emerald-400 to-green-500', emoji: '🌱' },
    developing: { label: 'Developing', color: 'from-blue-400 to-blue-600', emoji: '📈' },
    intermediate: { label: 'Intermediate', color: 'from-purple-400 to-purple-600', emoji: '⭐' },
    confident: { label: 'Confident', color: 'from-yellow-400 to-orange-500', emoji: '🔥' },
};

export default function AiProgressPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<{
        totalSessions: number;
        totalDuration: number;
        averageDuration: number;
        skillLevel: string;
        canMatchHumans: boolean;
        scenarioStats: ScenarioStat[];
        recentSessions: RecentSession[];
    } | null>(null);

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const response = await api.get('/ai/progress');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch progress:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProgress();
    }, []);

    const formatDuration = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-purple-500 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-600 rounded"></div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center text-white">
                <p>Failed to load progress data.</p>
            </div>
        );
    }

    const badge = SKILL_BADGES[stats.skillLevel] || SKILL_BADGES.beginner;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white"
        >
            {/* Header */}
            <header className="p-4 flex items-center gap-4">
                <button
                    onClick={() => navigate('/ai-practice')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="font-bold text-lg">Your Progress</h1>
                    <p className="text-sm text-slate-500">AI voice practice stats</p>
                </div>
            </header>

            <main className="px-6 pb-8 space-y-6 max-w-lg mx-auto">
                {/* Skill Level Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                >
                    <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${badge.color} text-white px-6 py-3 rounded-2xl shadow-lg text-lg font-bold`}>
                        <span className="text-2xl">{badge.emoji}</span>
                        {badge.label}
                    </div>
                    <p className="text-slate-500 text-sm mt-3">
                        {stats.totalSessions === 0
                            ? 'Complete your first session to get started!'
                            : `Based on ${stats.totalSessions} completed session${stats.totalSessions > 1 ? 's' : ''}`}
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-center"
                    >
                        <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
                        <p className="text-xs text-slate-500">Sessions</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-center"
                    >
                        <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration)}</p>
                        <p className="text-xs text-slate-500">Total Time</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-center"
                    >
                        <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-white">{formatDuration(stats.averageDuration)}</p>
                        <p className="text-xs text-slate-500">Avg Length</p>
                    </motion.div>
                </div>

                {/* Scenario Breakdown */}
                <div>
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Scenarios</h2>
                    <div className="space-y-3">
                        {stats.scenarioStats.map((s, i) => (
                            <motion.div
                                key={s.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className={`flex items-center gap-4 p-4 rounded-2xl border ${
                                    s.completed ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-800/60 border-slate-700/50'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                                    s.completed ? 'bg-green-500/10' : 'bg-purple-500/10'
                                }`}>
                                    {s.emoji}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-white text-sm">{s.title}</p>
                                    <p className="text-xs text-slate-500">
                                        {s.completed
                                            ? `✅ ${s.attempts} attempt${s.attempts > 1 ? 's' : ''} · Best: ${formatDuration(s.bestDuration || 0)}`
                                            : 'Not yet completed'}
                                    </p>
                                </div>
                                {!s.completed && (
                                    <button
                                        onClick={() => navigate(`/ai-practice/${s.id}`)}
                                        className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-500/30"
                                    >
                                        Start
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Recent Sessions */}
                {stats.recentSessions.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Recent Sessions</h2>
                        <div className="space-y-2">
                            {stats.recentSessions.map((session, i) => (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.05 * i }}
                                    className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/30"
                                >
                                    <div>
                                        <p className="text-sm text-white">{session.scenarioTitle}</p>
                                        <p className="text-xs text-slate-500">{formatDate(session.completedAt)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-purple-400">{formatDuration(session.duration)}</p>
                                        <p className="text-xs text-slate-500">{session.messageCount} msgs</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <div className="pt-4">
                    <Button onClick={() => navigate('/ai-practice')} className="w-full" size="lg">
                        Continue Practicing
                    </Button>
                </div>
            </main>
        </motion.div>
    );
}
