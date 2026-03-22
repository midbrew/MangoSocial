import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Browser Speech Recognition types
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function BotCallPage() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [botText, setBotText] = useState('');
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  const botId = sessionStorage.getItem('partner_id') || 'bot_ama';
  const botName = sessionStorage.getItem('bot_name') || 'Bot';

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleLeave();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const roomId = sessionStorage.getItem('peer_room_id') || 'bot-room';

  // Start with bot greeting
  useEffect(() => {
    const greetedKey = `greeted_${roomId}`;
    if (!sessionStorage.getItem(greetedKey)) {
      sessionStorage.setItem(greetedKey, 'true');
      sendToBotAndSpeak('');
    } else {
      // If remounted after greeting, just ensure mic is active
      startListening();
    }
  }, [botId, roomId]);

  const sendToBotAndSpeak = useCallback(async (userMessage: string) => {
    try {
      setIsBotThinking(true);

      const newHistory = [...conversationHistory];
      if (userMessage) {
        newHistory.push({ role: 'user', content: userMessage });
      }

      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const res = await fetch(`${API_URL}/ai/bot-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          botId,
          message: userMessage || 'Hey! Start the conversation naturally.',
          history: newHistory
        })
      });

      if (!res.ok) throw new Error('Bot response failed');

      const data = await res.json();
      
      setIsBotThinking(false);
      setBotText(data.text);

      newHistory.push({ role: 'assistant', content: data.text });
      setConversationHistory(newHistory);

      setIsBotSpeaking(true);
      // Play audio
      if (data.audioBase64) {
        await playAudio(data.audioBase64).catch(() => playBrowserTTS(data.text));
      } else {
        await playBrowserTTS(data.text);
      }

      setIsBotSpeaking(false);
      // Start listening for user's response
      startListening();
    } catch (error) {
      console.error('Bot communication error:', error);
      setIsBotThinking(false);
      setIsBotSpeaking(false);
      // Try to keep going
      setTimeout(() => startListening(), 1000);
    }
  }, [conversationHistory, botId]);

  const playAudio = (base64Audio: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
        audio.onended = () => resolve();
        audio.onerror = () => reject();
        audio.play().catch(() => reject());
      } catch {
        reject();
      }
    });
  };

  const playBrowserTTS = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  };

  const startListening = () => {
    if (!SpeechRecognition || isMuted) return;

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interimTranscript += t;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        // Reset silence timer on speech
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        if (finalTranscript) {
          // Wait a moment then send to bot
          silenceTimerRef.current = setTimeout(() => {
            setIsListening(false);
            if (recognitionRef.current) recognitionRef.current.stop();
            sendToBotAndSpeak(finalTranscript);
          }, 1500); // 1.5 seconds lets user pause without getting cut off
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
    }
  };

  const handleMicClick = () => {
    if (isMuted) {
      // Unmute and activate listening
      setIsMuted(false);
      if (!isBotSpeaking) startListening();
    } else if (!isListening) {
      // Not muted, but speech recognition stopped. Activate it.
      startListening();
    } else {
      // Mute and stop listening
      setIsMuted(true);
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleLeave = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (audioContextRef.current) audioContextRef.current.close();

    sessionStorage.setItem('call_duration', String(60 - timeLeft));
    sessionStorage.setItem('partner_name', botName);
    // Allow adding bot as friend!
    sessionStorage.setItem('friend_request_sent', 'false');

    navigate('/post-call');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6"
    >
      <div className="text-center max-w-md w-full space-y-8">
        {/* Timer */}
        <div className="text-4xl font-mono font-light text-orange-400">
          {formatTime(timeLeft)}
        </div>

        {/* Bot Avatar */}
        <div className="relative mx-auto w-32 h-32">
          <motion.div
            animate={isBotSpeaking ? {
              scale: [1, 1.15, 1],
              boxShadow: [
                '0 0 0px rgba(249, 115, 22, 0.3)',
                '0 0 40px rgba(249, 115, 22, 0.6)',
                '0 0 0px rgba(249, 115, 22, 0.3)'
              ]
            } : isBotThinking ? {
              scale: 1,
              boxShadow: '0 0 20px rgba(249, 115, 22, 0.2)'
            } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-xl"
          >
            <span className="text-5xl">🥭</span>
          </motion.div>
          {/* Speaking indicator */}
          {isBotSpeaking && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-orange-400"
            />
          )}
        </div>

        {/* Bot Name & Status */}
        <div>
          <h2 className="text-2xl font-bold">{botName}</h2>
          <p className="text-sm text-slate-400">
            {isBotSpeaking ? 'Speaking...' : isBotThinking ? 'Thinking...' : isListening ? 'Listening to you...' : 'Connected'}
          </p>
        </div>

        {/* Bot Text */}
        {botText && (
          <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
            <p className="text-sm text-slate-300 italic">"{botText}"</p>
          </div>
        )}

        {/* User Transcript */}
        {transcript && isListening && (
          <div className="bg-orange-500/10 rounded-2xl p-3 border border-orange-500/20">
            <p className="text-sm text-orange-300">You: {transcript}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 pt-6">
          <div className="relative">
            {isListening && !isMuted && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-orange-400 pointer-events-none"
              />
            )}
            <button
              onClick={handleMicClick}
              className={`relative z-10 p-5 rounded-full shadow-lg transition-transform hover:scale-105 ${
                isMuted ? 'bg-red-500/20 text-red-500' : 
                isListening ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.4)]' :
                'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <button
            onClick={() => setShowEndCallModal(true)}
            className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform hover:scale-105"
          >
            <PhoneOff className="w-8 h-8" />
          </button>
        </div>

        {/* Mic hint */}
        {!isBotSpeaking && !isListening && !isMuted && (
          <p className="text-xs text-slate-500">Tap the mic or just start talking</p>
        )}
      </div>

      {/* End Call Modal */}
      <AnimatePresence>
        {showEndCallModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <h2 className="text-lg font-bold text-white">End this call?</h2>
              <p className="text-sm text-slate-400">
                Are you sure you want to end your call with {botName}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndCallModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Keep Talking
                </button>
                <button
                  onClick={() => { setShowEndCallModal(false); handleLeave(); }}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  End Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
