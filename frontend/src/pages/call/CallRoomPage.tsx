import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Peer } from 'peerjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Mic, MicOff, PhoneOff, User } from 'lucide-react';
import { socketService } from '../../services/socket.service';

export default function CallRoomPage() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(60);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerExtended, setPartnerExtended] = useState(false);
  const [myExtended, setMyExtended] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [mangoIntentSent, setMangoIntentSent] = useState(false);
  const [partnerWantsMango, setPartnerWantsMango] = useState(false);
  const [showMangoMatch, setShowMangoMatch] = useState(false);
  const [mangoError, setMangoError] = useState('');
  const [showPartnerLeftModal, setShowPartnerLeftModal] = useState(false);
  const [partnerName, setPartnerName] = useState<string>('Your Match');
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const myAudioRef = useRef<HTMLAudioElement>(null);
  const partnerAudioRef = useRef<HTMLAudioElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasLeftRef = useRef(false);
  const timeLeftRef = useRef(60);
  const isPremiumRef = useRef(false);
  const showMangoMatchRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  const roomId = sessionStorage.getItem('peer_room_id');
  const myUid = sessionStorage.getItem('my_uid');
  const partnerId = sessionStorage.getItem('partner_id');
  const letsMangoWindowOpen = timeLeft <= 30;

  timeLeftRef.current = timeLeft;
  isPremiumRef.current = isPremium;
  showMangoMatchRef.current = showMangoMatch;

  const cleanupCallResources = (silent = false) => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;

    const socket = socketService.getSocket();
    if (socket && myUid) {
      socket.emit('leave-call', { userId: myUid, silent });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  };

  const leaveCall = ({
    destination = '/post-call',
    silent = false,
    skipPostCall = false,
  }: {
    destination?: string;
    silent?: boolean;
    skipPostCall?: boolean;
  } = {}) => {
    if (hasLeftRef.current) return;

    cleanupCallResources(silent);

    if (!skipPostCall) {
      const initialDuration = isPremiumRef.current ? 180 : 60;
      sessionStorage.setItem('call_duration', String(Math.max(0, initialDuration - timeLeftRef.current)));
      sessionStorage.setItem('friend_request_sent', String(showMangoMatchRef.current));
    }

    navigate(destination);
  };

  useEffect(() => {
    if (!roomId || !myUid || !partnerId) {
      navigate('/queue');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      navigate('/queue');
      return;
    }

    const myPeerId = `mangosocial_${roomId}_${myUid}`;
    const partnerPeerId = `mangosocial_${roomId}_${partnerId}`;

    const peer = new Peer(myPeerId, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      debug: 3
    });
    peerRef.current = peer;

    peer.on('open', () => {
      navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then((stream) => {
          streamRef.current = stream;
          if (myAudioRef.current) myAudioRef.current.srcObject = stream;

          peer.on('call', (call) => {
            call.answer(stream);
            call.on('stream', (remoteStream) => {
              if (partnerAudioRef.current) {
                partnerAudioRef.current.srcObject = remoteStream;
                partnerAudioRef.current.play().catch((error) => console.error('Audio play failed:', error));
              }
              setIsConnected(true);
            });
          });

          if (myUid < partnerId) {
            window.setTimeout(() => {
              const call = peer.call(partnerPeerId, stream);
              call.on('stream', (remoteStream) => {
                if (partnerAudioRef.current) {
                  partnerAudioRef.current.srcObject = remoteStream;
                  partnerAudioRef.current.play().catch((error) => console.error('Audio play failed:', error));
                }
                setIsConnected(true);
              });
            }, 1000);
          }
        })
        .catch((error) => {
          console.error('Failed to get local stream', error);
          alert('Microphone access is required.');
          navigate('/queue');
        });
    });

    // Reconnect logic with exponential backoff
    peer.on('disconnected', () => {
      if (hasLeftRef.current) return;
      const attempt = reconnectAttemptsRef.current;
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current = attempt + 1;
        setIsReconnecting(true);
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`PeerJS disconnected. Reconnect attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
        setTimeout(() => {
          if (!hasLeftRef.current && peerRef.current && peerRef.current.disconnected) {
            peerRef.current.reconnect();
          }
        }, delay);
      } else {
        console.log('PeerJS: max reconnect attempts reached');
        setIsReconnecting(false);
        setShowPartnerLeftModal(true);
        setTimeout(() => leaveCall(), 3000);
      }
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err.type, err.message);
      if (hasLeftRef.current) return;
      // For recoverable errors, let the disconnected handler manage retries
      if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        // PeerJS will emit 'disconnected' after these, which triggers reconnect
        return;
      }
      // For fatal errors (peer-unavailable etc), show partner-left
      if (err.type === 'peer-unavailable') {
        // Partner hasn't joined yet or left — not a reconnect scenario
        return;
      }
      setIsReconnecting(false);
      setShowPartnerLeftModal(true);
      setTimeout(() => leaveCall(), 3000);
    });

    // Reset reconnect counter when successfully reconnected
    peer.on('open', () => {
      if (reconnectAttemptsRef.current > 0) {
        console.log('PeerJS reconnected successfully');
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
      }
    });

    const onPartnerRequestedExtension = () => {
      setPartnerExtended(true);
    };

    const onTimeExtended = (data?: { bonusSeconds: number }) => {
      const bonus = data?.bonusSeconds || 60;
      setTimeLeft((prev) => prev + bonus);
      setMyExtended(false);
      setPartnerExtended(false);
    };

    const onPartnerLeft = () => {
      setShowPartnerLeftModal(true);
      // Auto-leave after showing the modal for 3 seconds
      setTimeout(() => {
        leaveCall();
      }, 3000);
    };

    const onPartnerWantsMango = () => {
      setPartnerWantsMango(true);
      setMangoError('');
    };

    const onMangoMatchSuccess = (data: { partnerId: string }) => {
      setShowMangoMatch(true);
      setMangoIntentSent(true);
      setPartnerWantsMango(true);
      setMangoError('');
      sessionStorage.setItem('friend_request_sent', 'true');

      window.setTimeout(() => {
        leaveCall({
          destination: `/chat/${data.partnerId}`,
          silent: true,
          skipPostCall: true,
        });
      }, 2200);
    };

    const onMangoMatchError = (data?: { message?: string }) => {
      setMangoError(data?.message || 'Could not complete your Mango match.');
    };

    socket.on('partner-requested-extension', onPartnerRequestedExtension);
    socket.on('time-extended', onTimeExtended);
    socket.on('partner-left', onPartnerLeft);
    socket.on('partner-wants-mango', onPartnerWantsMango);
    socket.on('mango-match-success', onMangoMatchSuccess);
    socket.on('mango-match-error', onMangoMatchError);

    return () => {
      socket.off('partner-requested-extension', onPartnerRequestedExtension);
      socket.off('time-extended', onTimeExtended);
      socket.off('partner-left', onPartnerLeft);
      socket.off('partner-wants-mango', onPartnerWantsMango);
      socket.off('mango-match-success', onMangoMatchSuccess);
      socket.off('mango-match-error', onMangoMatchError);
      cleanupCallResources(true);
    };
  }, [myUid, navigate, partnerId, roomId]);

  // Fetch partner metadata for display during call
  useEffect(() => {
    const storedBotName = sessionStorage.getItem('bot_name');
    const isBotMatch = sessionStorage.getItem('is_bot_match') === 'true';

    if (isBotMatch && storedBotName) {
      setPartnerName(storedBotName);
      return;
    }

    if (partnerId && partnerId.length > 10) {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${API_URL}/user/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setPartnerName(data.user.profile?.name || 'Your Match');
            setPartnerAvatar(data.user.profile?.avatarUrl || null);
          }
        })
        .catch(() => {});
    }
  }, [partnerId]);

  useEffect(() => {
    let timer: number | undefined;

    if (isConnected && timeLeft > 0 && !showMangoMatch) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showMangoMatch) {
      leaveCall();
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isConnected, showMangoMatch, timeLeft]);

  useEffect(() => {
    const checkPremium = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user?.premiumStatus?.isPremium) {
            setIsPremium(true);
            setTimeLeft(180);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };

    checkPremium();
  }, []);

  useEffect(() => {
    if (!isConnected || !partnerAudioRef.current || !partnerAudioRef.current.srcObject) return;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(partnerAudioRef.current.srcObject as MediaStream);
      source.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animationId: number;

      const monitorAudio = () => {
        animationId = requestAnimationFrame(monitorAudio);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        setAudioVolume(Math.min(100, sum / bufferLength));
      };

      monitorAudio();

      return () => {
        cancelAnimationFrame(animationId);
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      };
    } catch (error) {
      console.error('Audio visualizer failed to start', error);
    }
  }, [isConnected]);

  const handleExtendTime = () => {
    const socket = socketService.getSocket();
    if (socket && !myExtended && myUid) {
      socket.emit('extend-time', { userId: myUid, isPremium });
      setMyExtended(true);
    }
  };

  const toggleMute = () => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;

    const isCurrentlyMuted = !audioTracks[0].enabled;
    audioTracks[0].enabled = isCurrentlyMuted;
    setIsMuted(!isCurrentlyMuted);
  };

  const handleLetsMango = () => {
    const socket = socketService.getSocket();
    if (!socket || !myUid || !letsMangoWindowOpen || mangoIntentSent || showMangoMatch) return;

    socket.emit('lets-mango', { userId: myUid });
    setMangoIntentSent(true);
    setMangoError('');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden"
    >
      <audio ref={myAudioRef} muted autoPlay playsInline className="hidden" />
      <audio ref={partnerAudioRef} autoPlay playsInline className="hidden" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),transparent_35%),radial-gradient(circle_at_bottom,rgba(99,102,241,0.18),transparent_40%)]" />

      <div className="relative w-full max-w-sm flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-medium text-white/80">
            {isReconnecting ? 'Reconnecting...' : isConnected ? 'In Call' : 'Connecting to partner...'}
          </h2>
          <div className="text-6xl font-light text-white tracking-widest font-mono flex items-center justify-center gap-3">
            <Clock className="w-10 h-10 text-indigo-400" />
            {formatTime(timeLeft)}
          </div>
          {(myExtended || partnerExtended) && (
            <p className="text-sm text-indigo-300">
              {myExtended && partnerExtended
                ? 'Time extended!'
                : myExtended
                  ? 'Waiting for partner to extend...'
                  : 'Partner wants to extend!'}
            </p>
          )}
        </div>

        <div className="relative w-40 h-40">
          <div
            className={`absolute inset-0 bg-indigo-600 rounded-full flex flex-col items-center justify-center transition-all duration-75 ${!isConnected ? 'opacity-50' : ''}`}
            style={{
              transform: isConnected ? `scale(${1 + (audioVolume / 400)})` : 'scale(1)',
              boxShadow: isConnected ? `0 0 ${20 + audioVolume}px rgba(99, 102, 241, ${0.4 + (audioVolume / 200)})` : 'none'
            }}
          >
            {partnerAvatar ? (
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full rounded-full object-cover absolute inset-0" />
            ) : (
              <User className="w-10 h-10 text-white/60 z-10" />
            )}
          </div>
          {isConnected && (
            <div
              className="absolute inset-0 rounded-full border-2 border-indigo-400 opacity-20 pointer-events-none transition-all duration-75"
              style={{ transform: `scale(${1 + (audioVolume / 200)})` }}
            />
          )}
        </div>
        <p className="text-white/70 text-sm font-medium mt-2 text-center">{partnerName}</p>

        <div className="w-full space-y-4">
          <AnimatePresence>
            {letsMangoWindowOpen && !showMangoMatch && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="bg-orange-500/10 border border-orange-400/20 rounded-3xl p-5 text-center space-y-3"
              >
                <p className="text-orange-200 font-medium">Last 30 seconds</p>
                <p className="text-sm text-orange-100/80">
                  If this is feeling good, both of you can tap <span className="font-semibold text-white">Let&apos;s Mango</span> to match.
                </p>
                <button
                  onClick={handleLetsMango}
                  disabled={mangoIntentSent}
                  className={`w-full rounded-2xl px-5 py-4 font-semibold transition-all ${
                    mangoIntentSent
                      ? 'bg-emerald-500/20 text-emerald-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 text-slate-950 hover:scale-[1.02] shadow-lg shadow-orange-500/25'
                  }`}
                >
                  {mangoIntentSent ? 'Waiting For Their Mango...' : "Let's Mango"}
                </button>
                {partnerWantsMango && !mangoIntentSent && (
                  <p className="text-sm text-emerald-300">They want to mango with you.</p>
                )}
                {mangoError && (
                  <p className="text-sm text-rose-300">{mangoError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center gap-6 pt-2">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={() => setShowEndCallModal(true)}
              className="p-5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform hover:scale-105"
            >
              <PhoneOff className="w-8 h-8" />
            </button>

            <button
              onClick={handleExtendTime}
              disabled={myExtended}
              className={`px-6 py-4 rounded-full font-medium transition-all ${myExtended ? 'bg-indigo-900/50 text-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25'}`}
            >
              +{isPremium ? '2' : '1'} Min
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMangoMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 z-50"
          >
            <div className="relative text-center max-w-sm w-full space-y-6">
              {[...Array(10)].map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 1, scale: 0.5, y: 0, x: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1.2,
                    y: -150 - (index * 6),
                    x: (index - 5) * 24,
                    rotate: index % 2 === 0 ? -18 : 18,
                  }}
                  transition={{ duration: 1.8, delay: index * 0.05, ease: 'easeOut' }}
                  className="absolute left-1/2 top-1/2 text-3xl pointer-events-none"
                >
                  {index % 3 === 0 ? '✨' : '🥭'}
                </motion.div>
              ))}

              <motion.div
                initial={{ scale: 0.8, rotate: -12 }}
                animate={{ scale: [0.9, 1.05, 1], rotate: [-12, 6, 0] }}
                transition={{ duration: 0.8 }}
                className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-orange-300 via-orange-500 to-amber-300 flex items-center justify-center shadow-[0_0_60px_rgba(251,146,60,0.4)]"
              >
                <span className="text-5xl">🥭</span>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">It&apos;s A Mango Match!</h2>
                <p className="text-orange-100/80">
                  You both said yes. Opening your chat now...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEndCallModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
            >
              <h2 className="text-lg font-bold text-white">End this call?</h2>
              <p className="text-sm text-slate-400">
                If you want to match, both of you need to tap Let&apos;s Mango during the final 30 seconds.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndCallModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Keep Talking
                </button>
                <button
                  onClick={() => {
                    setShowEndCallModal(false);
                    leaveCall();
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  End Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Partner Left Modal */}
      <AnimatePresence>
        {showPartnerLeftModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl text-center"
            >
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">👋</span>
              </div>
              <h2 className="text-lg font-bold text-white">Partner Left</h2>
              <p className="text-sm text-slate-400">
                {partnerName} has left the call. You'll be redirected shortly.
              </p>
              <button
                onClick={() => leaveCall()}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
