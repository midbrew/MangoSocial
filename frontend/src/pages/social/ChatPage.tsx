import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Bot, User } from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';
import { socketService } from '../../services/socket.service';

export default function ChatPage() {
  const { id } = useParams(); // partnerId
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [partnerDetails, setPartnerDetails] = useState<any>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const myUserId = user?._id || user?.id || null;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBot = id?.startsWith('bot_') ?? false;

  // -- Socket setup ---------------------------------------------------------
  useEffect(() => {
    if (!myUserId || !id) return;

    const socket = socketService.connect(myUserId);

    // Join the chat room
    socket.emit('join-chat', { userId: myUserId, partnerId: id });

    const onReceiveMessage = (msg: any) => {
      // Only add messages relevant to this conversation
      const isRelevant =
        (msg.senderId === myUserId && msg.receiverId === id) ||
        (msg.senderId === id && msg.receiverId === myUserId);
      if (!isRelevant) return;

      setMessages((prev) => {
        // Deduplicate by _id
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      // Mark received messages as read
      if (msg.senderId === id) {
        socket.emit('mark-read', { userId: myUserId, partnerId: id });
      }

      setIsBotThinking(false);
    };

    const onPartnerTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === id) {
        setIsPartnerTyping(data.isTyping);
      }
    };

    socket.on('receive-message', onReceiveMessage);
    socket.on('partner-typing', onPartnerTyping);

    return () => {
      socket.off('receive-message', onReceiveMessage);
      socket.off('partner-typing', onPartnerTyping);
      socket.emit('leave-chat', { userId: myUserId, partnerId: id });
    };
  }, [myUserId, id]);

  // -- Fetch partner details & initial messages -----------------------------
  useEffect(() => {
    if (!id) return;

    // Fetch partner metadata
    api.get('/friends').then((res) => {
      const friend = res.data.find((f: any) => f.id === id);
      if (friend) setPartnerDetails(friend);
    }).catch(console.error);

    // Fetch message history (REST for initial load)
    fetchMessages();
  }, [id]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${id}`);
      setMessages(res.data);
      setError('');
    } catch (e) {
      console.error(e);
      setError((e as any).response?.data?.error || 'Unable to load this chat right now.');
    }
  };

  // -- Auto-scroll ----------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotThinking, isPartnerTyping]);

  // -- Typing indicator emission --------------------------------------------
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = socketService.getSocket();
      if (!socket || !myUserId || !id || isBot) return;
      socket.emit('typing', { userId: myUserId, partnerId: id, isTyping });
    },
    [myUserId, id, isBot]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    // Send typing: true, then debounce to send typing: false after 1.5s of inactivity
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500);
  };

  // -- Send message ---------------------------------------------------------
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !id || !myUserId) return;

    const content = input.trim();
    setInput('');
    emitTyping(false);

    if (isBot) {
      // Bot conversations go through REST (AI response pipeline)
      const optimisticMessage = {
        _id: Date.now().toString(),
        senderId: myUserId,
        receiverId: id,
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setIsBotThinking(true);

      try {
        await api.post('/messages', { receiverId: id, content });
        await fetchMessages();
      } catch (e) {
        console.error(e);
        setError((e as any).response?.data?.error || 'Unable to send message right now.');
        setMessages((prev) => prev.filter((m) => m._id !== optimisticMessage._id));
      } finally {
        setIsBotThinking(false);
      }
    } else {
      // Human conversations go through the socket for real-time delivery
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('send-message', { senderId: myUserId, receiverId: id, content });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-orange-50 to-white text-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white shadow-sm">
        <button onClick={() => navigate('/friends')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => !isBot && id && navigate(`/profile/${id}`)}
        >
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0 text-orange-500">
            {partnerDetails?.profileImageUrl || partnerDetails?.avatarUrl ? (
              <img src={partnerDetails.profileImageUrl || partnerDetails.avatarUrl} className="w-full h-full object-cover" alt="" />
            ) : partnerDetails?.isBot ? (
              <Bot className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">{partnerDetails?.displayName || partnerDetails?.name || 'Loading...'}</h2>
              {partnerDetails?.isBot && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  AI
                </span>
              )}
            </div>
            {(isPartnerTyping || isBotThinking) && (
              <p className="text-xs text-orange-500 animate-pulse">typing...</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm max-w-xs">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <span className="text-4xl">💭</span>
            <p className="text-sm">Say hi to {partnerDetails?.displayName || partnerDetails?.name || 'your friend'}!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === myUserId;
            return (
              <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%] space-y-1 relative">
                  <div className={`px-4 py-2.5 rounded-2xl ${
                      isMe 
                        ? 'bg-orange-500 text-white rounded-br-none shadow-orange-500/20 shadow-lg' 
                        : 'bg-white border border-gray-100 text-gray-900 rounded-bl-none shadow-sm'
                  }`}>
                    <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className={`flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {(isPartnerTyping || isBotThinking) && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100 pb-8 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto items-end">
          <input 
            type="text" 
            value={input}
            onChange={handleInputChange}
            placeholder="Message..."
            disabled={isBotThinking || !!error}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3.5 text-gray-900 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all placeholder:text-gray-400 disabled:opacity-50"
            autoFocus
          />
          <button 
            type="submit"
            disabled={!input.trim() || isBotThinking || !!error}
            className="p-3.5 bg-orange-500 text-white rounded-full hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20 flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
