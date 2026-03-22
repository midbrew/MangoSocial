import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, MicOff, Check, Loader2, MessageSquare, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { api, useAuth } from '../../context/AuthContext';

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

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

const SESSION_TIMEOUT = 120; // 2 minutes in seconds
const WARNING_THRESHOLD = 15; // Show warning with 15 seconds left

export default function AiChatPage() {
    const navigate = useNavigate();
    const { updateUser } = useAuth();
    const { scenarioId } = useParams<{ scenarioId: string }>();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [shouldEnd, setShouldEnd] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [completionData, setCompletionData] = useState<{
        completedCount: number;
        canMatchHumans: boolean;
    } | null>(null);

    // Voice state
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [showTranscript, setShowTranscript] = useState(false);
    const [timer, setTimer] = useState(0);

    // Refs
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const voicesLoadedRef = useRef(false);
    const pendingSpeechRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const handleVoiceMessageRef = useRef<(text: string) => void>(() => {});
    const isSendingRef = useRef(false);

    // Timer
    useEffect(() => {
        if (sessionId && !isCompleted) {
            timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [sessionId, isCompleted]);

    // Auto-complete on timeout
    useEffect(() => {
        if (timer >= SESSION_TIMEOUT && sessionId && !isCompleted && !isCompleting) {
            completeSession('timeout');
        }
    }, [timer, sessionId, isCompleted, isCompleting]);

    // Initialize speech
    useEffect(() => {
        synthRef.current = window.speechSynthesis;

        // Chrome loads voices asynchronously — wait for them
        const loadVoices = () => {
            const voices = synthRef.current?.getVoices() || [];
            if (voices.length > 0) {
                voicesLoadedRef.current = true;
                // If there's a pending speech from before voices loaded (and no ElevenLabs audio was sent), speak it now
                if (pendingSpeechRef.current) {
                    speakText(pendingSpeechRef.current);
                    pendingSpeechRef.current = null;
                }
            }
        };

        loadVoices();
        if (synthRef.current) {
            synthRef.current.addEventListener('voiceschanged', loadVoices);
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const result = event.results[event.results.length - 1];
                const text = result[0].transcript;
                setTranscript(text);
                if (result.isFinal) {
                    handleVoiceMessageRef.current(text);
                }
            };

            recognition.onerror = (e: any) => {
                console.error('Speech recognition error:', e.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch {}
            }
            if (synthRef.current) {
                synthRef.current.removeEventListener('voiceschanged', loadVoices);
                synthRef.current.cancel();
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    // Start session
    useEffect(() => {
        startSession();
    }, [scenarioId]);

    const startSession = async () => {
        try {
            const response = await api.post('/ai/sessions/start', { scenarioId });
            setSessionId(response.data.sessionId);
            setScenario(response.data.scenario);
            setMessages(response.data.messages);

            // Speak or play the AI's first message
            if (response.data.messages.length > 0) {
                const first = response.data.messages[0];
                if (first.role === 'assistant') {
                    playAudioResponse(response.data.audioBase64, first.content);
                }
            }
        } catch (error: any) {
            console.error('Failed to start session:', error);
            if (error.response?.data?.error === 'You have already completed this scenario') {
                navigate('/ai-practice');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const playAudioResponse = (audioBase64: string | undefined, fallbackText: string) => {
        // Stop any current speaking
        if (synthRef.current) synthRef.current.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        if (audioBase64) {
            // Play ElevenLabs High-Quality Audio
            const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
            
            audio.onplaying = () => setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            
            audio.onerror = () => {
                console.error("Audio playback error, falling back to browser TTS");
                setIsSpeaking(false);
                if (voicesLoadedRef.current) speakText(fallbackText);
                else pendingSpeechRef.current = fallbackText;
            };

            audioRef.current = audio;
            audio.play().catch(e => {
                console.error("Audio play blocked by browser, falling back to browser TTS", e);
                setIsSpeaking(false);
                if (voicesLoadedRef.current) speakText(fallbackText);
                else pendingSpeechRef.current = fallbackText;
            });
        } else {
            // Fallback to browser TTS if no audio was generated
            if (voicesLoadedRef.current) speakText(fallbackText);
            else pendingSpeechRef.current = fallbackText;
        }
    };

    const speakText = (text: string) => {
        if (!synthRef.current) return;
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        // Prefer a natural-sounding English voice
        const voices = synthRef.current.getVoices();
        const preferred = voices.find((v: SpeechSynthesisVoice) =>
            v.lang.startsWith('en') && (
                v.name.includes('Samantha') ||
                v.name.includes('Google US English') ||
                v.name.includes('Karen') ||
                v.name.includes('Daniel') ||
                v.name.includes('Natural')
            )
        ) || voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('en'));
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        // Chrome workaround: ensure synth isn't paused
        synthRef.current.resume();
        synthRef.current.speak(utterance);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in this browser. Please use Chrome.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            if (synthRef.current) synthRef.current.cancel();
            if (audioRef.current) audioRef.current.pause();
            setIsSpeaking(false);
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleVoiceMessage = useCallback(async (text: string) => {
        if (!text.trim() || !sessionId || isSendingRef.current) return;

        isSendingRef.current = true;
        setIsSending(true);
        setTranscript('');

        setMessages(prev => [...prev, {
            role: 'user', content: text.trim(), timestamp: new Date().toISOString()
        }]);

        try {
            const response = await api.post(`/ai/sessions/${sessionId}/message`, { message: text.trim() });
            setMessages(response.data.messages);
            setShouldEnd(response.data.shouldEnd);

            // Speak or play the AI response
            const aiMessages = response.data.messages.filter((m: Message) => m.role === 'assistant');
            if (aiMessages.length > 0) {
                playAudioResponse(response.data.audioBase64, aiMessages[aiMessages.length - 1].content);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            isSendingRef.current = false;
            setIsSending(false);
        }
    }, [sessionId]);

    // Keep ref in sync so the speech-recognition closure always calls the latest version
    useEffect(() => {
        handleVoiceMessageRef.current = handleVoiceMessage;
    }, [handleVoiceMessage]);

    const completeSession = async (reason: string = 'user_ended') => {
        if (!sessionId || isCompleting) return;
        setIsCompleting(true);
        if (synthRef.current) synthRef.current.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const response = await api.post(`/ai/sessions/${sessionId}/complete`, { completionReason: reason });
            setIsCompleted(true);
            setCompletionData({
                completedCount: response.data.completedCount,
                canMatchHumans: response.data.canMatchHumans
            });
            // Sync user state so HomePage knows human matching is unlocked
            updateUser({
                aiSessionsCompleted: response.data.completedCount,
                canMatchHumans: response.data.canMatchHumans
            });
        } catch (error: any) {
            console.error('Failed to complete session:', error);
            alert(error.response?.data?.error || 'Failed to complete session');
        } finally {
            setIsCompleting(false);
        }
    };

    const timeRemaining = SESSION_TIMEOUT - timer;
    const isWarning = timeRemaining <= WARNING_THRESHOLD && timeRemaining > 0 && !isCompleted;

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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

    // Completion screen
    if (isCompleted && completionData) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md"
                >
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/50">
                        <Check className="w-10 h-10 text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Great Job! 🎉</h1>
                    <p className="text-slate-400 mb-2">
                        You practiced "{scenario?.title}" for {formatTime(timer)}.
                    </p>
                    <p className="text-slate-500 mb-6 text-sm">
                        {messages.filter(m => m.role === 'user').length} voice exchanges completed
                    </p>

                    <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 mb-6">
                        <p className="text-sm text-slate-400 mb-2">Progress</p>
                        <p className="text-4xl font-bold text-purple-400">
                            {completionData.completedCount}/3
                        </p>
                        <p className="text-sm text-slate-500">scenarios completed</p>
                    </div>

                    {completionData.canMatchHumans ? (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-3 rounded-xl font-medium">
                                🎊 Human Matching Unlocked!
                            </div>
                            <Button onClick={() => navigate('/queue')} className="w-full" size="lg">
                                Start Matching
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Button onClick={() => navigate('/ai-practice')} className="w-full" size="lg">
                                Continue Practice
                            </Button>
                            <button
                                onClick={() => navigate('/ai-progress')}
                                className="text-sm text-purple-400 hover:text-purple-300"
                            >
                                View Progress
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
            {/* Header */}
            <header className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/ai-practice')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-white text-sm">{scenario?.emoji} {scenario?.title}</h1>
                        <p className="text-xs text-slate-500">Voice Practice with AI</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono px-3 py-1 rounded-full ${isWarning ? 'text-red-400 bg-red-500/20 animate-pulse' : 'text-purple-400 bg-purple-500/10'}`}>
                        {formatTime(Math.max(0, timeRemaining))}
                    </span>
                    <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className={`p-2 rounded-full transition-colors ${showTranscript ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:bg-white/10'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Timer Progress Bar */}
            <div className="px-4">
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${isWarning ? 'bg-red-500' : 'bg-purple-500'}`}
                        initial={{ width: '100%' }}
                        animate={{ width: `${Math.max(0, (timeRemaining / SESSION_TIMEOUT) * 100)}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {/* Timeout Warning */}
            <AnimatePresence>
                {isWarning && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2 bg-red-500/10 border-b border-red-500/20"
                    >
                        <p className="text-xs text-red-400 text-center font-medium">
                            ⏰ Session ending in {timeRemaining} seconds
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Voice Call Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {/* AI Avatar */}
                <motion.div className="mb-12 relative">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-2xl shadow-purple-500/30 ${isSpeaking ? 'ring-4 ring-purple-400/60 ring-offset-4 ring-offset-slate-950' : ''}`}
                        style={{ transition: 'all 0.3s ease' }}
                    >
                        🥭
                    </div>
                    {isSpeaking && (
                        <motion.div
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full bg-purple-500/20"
                        />
                    )}
                    <div className="text-center mt-4">
                        <p className="text-white font-semibold">Mango AI</p>
                        <p className="text-xs text-slate-500">
                            {isSpeaking ? '🔊 Speaking...' : isSending ? '🤔 Thinking...' : '🎧 Listening...'}
                        </p>
                    </div>
                </motion.div>

                {/* Live Transcript Overlay */}
                {transcript && isListening && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-40 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-2xl max-w-sm text-center text-sm"
                    >
                        "{transcript}"
                    </motion.div>
                )}

                {/* Mic Button */}
                <motion.button
                    onClick={toggleListening}
                    disabled={isSending || isSpeaking || isCompleted}
                    whileTap={{ scale: 0.9 }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                        isListening
                            ? 'bg-red-500 shadow-red-500/40 ring-4 ring-red-400/30 ring-offset-4 ring-offset-slate-950'
                            : isSending || isSpeaking
                                ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                : 'bg-gradient-to-r from-orange-500 to-pink-500 shadow-orange-500/30 hover:shadow-orange-500/50'
                    }`}
                >
                    {isListening ? (
                        <MicOff className="w-8 h-8 text-white" />
                    ) : (
                        <Mic className="w-8 h-8 text-white" />
                    )}
                </motion.button>
                <p className="text-xs text-slate-500 mt-3">
                    {isListening ? 'Tap to stop' : isSending ? 'AI is processing...' : isSpeaking ? 'AI is speaking...' : 'Tap to speak'}
                </p>
            </div>

            {/* End Session Prompt */}
            {shouldEnd && !isCompleted && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-4 bg-purple-500/10 border-t border-purple-500/20"
                >
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <p className="text-sm text-purple-300">Great conversation! Ready to finish?</p>
                        <Button
                            onClick={() => completeSession('user_ended')}
                            isLoading={isCompleting}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Complete Session
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Transcript Panel (togglable) */}
            <AnimatePresence>
                {showTranscript && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm"
                    >
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Transcript</span>
                            <button onClick={() => setShowTranscript(false)} className="text-slate-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                                        msg.role === 'user'
                                            ? 'bg-orange-500/20 text-orange-200'
                                            : 'bg-slate-800 text-slate-300'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 px-3 py-2 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
