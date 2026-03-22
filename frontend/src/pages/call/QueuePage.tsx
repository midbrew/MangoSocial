import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socketService } from '../../services/socket.service';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, UserPlus, Bot, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function QueuePage() {
  const [status, setStatus] = useState('Connecting to server...');
  const [error, setError] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const userId = user?._id || user?.id;

  useEffect(() => {
    if (isLoading) return; // Wait for auth to initialize before checking userId

    if (!userId) {
      setError('You must be logged in to join the queue.');
      setStatus('Failed to join queue.');
      return;
    }

    const playMatchSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // A5
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        // Ignore audio errors if browser blocks autoplay
      }
    };

    const socket = socketService.connect(userId);

    setStatus('Joining matchmaking queue...');
    socket.emit('join-queue', { userId });

    socket.on('match-found', (data: { roomId: string; partnerId: string; uid: string; isBot?: boolean; botName?: string }) => {
      playMatchSound();
      setStatus(data.isBot ? `Matched with ${data.botName}! Connecting...` : 'Match found! Connecting...');
      // Store session details temporarily
      sessionStorage.setItem('peer_room_id', data.roomId);
      sessionStorage.setItem('my_uid', data.uid);
      sessionStorage.setItem('partner_id', data.partnerId);
      
      // Store bot info if applicable
      if (data.isBot) {
        sessionStorage.setItem('is_bot_match', 'true');
        sessionStorage.setItem('bot_name', data.botName || 'Bot');
      } else {
        sessionStorage.removeItem('is_bot_match');
        sessionStorage.removeItem('bot_name');
      }
      
      // Navigate to call room
      setTimeout(() => {
        navigate(data.isBot ? '/bot-call' : '/call');
      }, 1000);
    });

    socket.on('queue-error', (data: { message: string }) => {
      setError(data.message);
      setStatus('Failed to join queue.');
    });

    socket.on('queue-timeout', () => {
      setStatus('timeout');
    });

    return () => {
      socket.emit('leave-queue', { userId });
      socket.off('match-found');
      socket.off('queue-error');
      socket.off('queue-timeout');
    };
  }, [userId, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mx-auto w-32 h-32 bg-indigo-600/20 rounded-full flex items-center justify-center"
        >
          <div className="w-24 h-24 bg-indigo-600/40 rounded-full flex items-center justify-center">
             <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_30px_theme('colors.indigo.500')]">
               <Phone className="w-8 h-8 text-white animate-pulse" />
             </div>
          </div>
        </motion.div>

        {error ? (
           <div className="space-y-4">
               <h2 className="text-2xl font-bold text-red-500 tracking-tight">Access Denied</h2>
               <p className="text-red-200/80">{error}</p>
               {error.includes('limit reached') && (
                   <button className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full font-medium hover:scale-105 transition-transform">
                       Upgrade to Premium
                   </button>
               )}
           </div>
        ) : status === 'timeout' ? (
           <div className="space-y-4 bg-slate-900 border border-slate-700 p-6 rounded-3xl relative z-10 w-full">
               <h2 className="text-2xl font-bold text-white tracking-tight">No Matches Found</h2>
               <p className="text-slate-400 text-sm">It's a bit quiet right now. You can update your interests to match with more people, or practice talking with our AI.</p>
               <div className="flex flex-col gap-3 mt-6">
                   <button 
                       onClick={() => navigate('/profile-setup')} 
                       className="px-6 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center gap-2 rounded-2xl font-medium hover:scale-[1.02] transition-transform shadow-lg shadow-orange-500/20"
                   >
                       <UserPlus className="w-5 h-5" />
                       Update Interests
                   </button>
                   <button 
                       onClick={() => {
                         setStatus('Joining AI session...');
                         socketService.getSocket()?.emit('force-bot-match', { userId });
                       }} 
                       className="px-6 py-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center gap-2 font-medium rounded-2xl hover:bg-indigo-500/20 transition-colors"
                   >
                       <Bot className="w-5 h-5" />
                       Practice with AI Bot
                   </button>
                   <button 
                       onClick={() => navigate('/')} 
                       className="px-4 py-3 text-slate-400 font-medium rounded-xl hover:text-white transition-colors flex justify-center items-center gap-2"
                   >
                       <ArrowLeft className="w-4 h-4" />
                       Return Home
                   </button>
               </div>
           </div>
        ) : (
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-bold text-white tracking-tight">Finding a match</h2>
            <p className="text-indigo-200/80">{status}</p>
          </div>
        )}

        {status !== 'timeout' && (
          <button
            onClick={() => setShowLeaveModal(true)}
            className="mt-8 px-6 py-2 rounded-full border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition-colors relative z-10"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Leave Queue Confirmation */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <h2 className="text-lg font-bold text-white">Stop searching?</h2>
              <p className="text-sm text-slate-400">
                You'll leave the matching queue. You can join again anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Keep Searching
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30"
                >
                  Leave Queue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
