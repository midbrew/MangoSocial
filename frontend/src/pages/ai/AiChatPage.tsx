import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { api } from '../../context/AuthContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface Scenario {
    id: string;
    title: string;
    description: string;
    emoji: string;
}

export default function AiChatPage() {
    const navigate = useNavigate();
    const { scenarioId } = useParams<{ scenarioId: string }>();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [shouldEnd, setShouldEnd] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [completionData, setCompletionData] = useState<{
        completedCount: number;
        canMatchHumans: boolean;
    } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        startSession();
    }, [scenarioId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const startSession = async () => {
        try {
            const response = await api.post('/ai/sessions/start', { scenarioId });
            setSessionId(response.data.sessionId);
            setScenario(response.data.scenario);
            setMessages(response.data.messages);
        } catch (error: any) {
            console.error('Failed to start session:', error);
            if (error.response?.data?.error === 'You have already completed this scenario') {
                navigate('/ai-practice');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || !sessionId || isSending) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        setIsSending(true);

        // Optimistically add user message
        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        }]);

        try {
            const response = await api.post(`/ai/sessions/${sessionId}/message`, {
                message: userMessage
            });
            setMessages(response.data.messages);
            setShouldEnd(response.data.shouldEnd);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const completeSession = async () => {
        if (!sessionId || isCompleting) return;

        setIsCompleting(true);
        try {
            const response = await api.post(`/ai/sessions/${sessionId}/complete`);
            setIsCompleted(true);
            setCompletionData({
                completedCount: response.data.completedCount,
                canMatchHumans: response.data.canMatchHumans
            });
        } catch (error: any) {
            console.error('Failed to complete session:', error);
            alert(error.response?.data?.error || 'Failed to complete session');
        } finally {
            setIsCompleting(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
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

    // Completion screen
    if (isCompleted && completionData) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Great Job! 🎉</h1>
                    <p className="text-gray-500 mb-6">
                        You've completed the "{scenario?.title}" practice session.
                    </p>

                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                        <p className="text-sm text-gray-500 mb-2">Progress</p>
                        <p className="text-3xl font-bold text-purple-600">
                            {completionData.completedCount}/3
                        </p>
                        <p className="text-sm text-gray-500">scenarios completed</p>
                    </div>

                    {completionData.canMatchHumans ? (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-3 rounded-xl font-medium">
                                🎊 Human Matching Unlocked!
                            </div>
                            <Button onClick={() => navigate('/')} className="w-full" size="lg">
                                Start Matching
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Button onClick={() => navigate('/ai-practice')} className="w-full" size="lg">
                                Continue Practice
                            </Button>
                            <button
                                onClick={() => navigate('/')}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Go Home
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="p-4 border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                <button
                    onClick={() => navigate('/ai-practice')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">{scenario?.emoji}</span>
                    </div>
                    <div>
                        <h1 className="font-semibold text-gray-900">{scenario?.title}</h1>
                        <p className="text-xs text-gray-500">Practice with AI</p>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                                    message.role === 'user'
                                        ? 'bg-orange-500 text-white rounded-br-md'
                                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                }`}
                            >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isSending && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Thinking...</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* End Session Prompt */}
            {shouldEnd && !isCompleted && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 bg-purple-50 border-t border-purple-100"
                >
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-purple-700">Great conversation! Ready to finish?</p>
                        <Button
                            onClick={completeSession}
                            isLoading={isCompleting}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Complete Session
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        className="flex-1 h-12 px-4 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        disabled={isSending || isCompleted}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputValue.trim() || isSending || isCompleted}
                        className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
