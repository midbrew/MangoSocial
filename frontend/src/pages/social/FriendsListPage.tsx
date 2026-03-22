import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, MessageCircle, User, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../context/AuthContext';

interface Friend {
  id: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  isBot?: boolean;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  lastActivityAt?: string;
}

interface FriendRequest {
  id: string;
  partnerId: string;
  partner: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export default function FriendsListPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get('/friends'),
        api.get('/friends/requests'),
      ]);

      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await api.put(`/connections/accept/${requestId}`);
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await api.delete(`/connections/${requestId}`);
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const formatTimestamp = (date?: string) => {
    if (!date) return '';

    const parsed = new Date(date);
    const diffMinutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <header className="p-4 flex items-center gap-4 border-b border-gray-100 bg-white shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-lg">Your Mangoes 🥭</h1>
          <p className="text-xs text-gray-500">
            {friends.length} chat{friends.length !== 1 ? 's' : ''}{requests.length ? ` • ${requests.length} request${requests.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {requests.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Requests</p>
                {requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {request.partner.avatarUrl ? (
                          <img src={request.partner.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <User className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{request.partner.name}</p>
                        <p className="text-sm text-gray-500">Wants to connect with you</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => handleDecline(request.id)}
                        className="px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 inline mr-2" />
                        Not now
                      </button>
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
                      >
                        <Check className="w-4 h-4 inline mr-2" />
                        Accept
                      </button>
                    </div>
                  </motion.div>
                ))}
              </section>
            )}

            <section className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Inbox</p>
              {friends.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                  <span className="text-4xl mb-3 block">🥭</span>
                  <p className="font-medium text-gray-700 mb-1">No mangoes yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Have a good call and both tap Let&apos;s Mango in the final 30 seconds.
                  </p>
                  <button
                    onClick={() => navigate('/queue')}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 transition-colors"
                  >
                    Start Matching
                  </button>
                </div>
              ) : (
                friends.map((friend, index) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:border-orange-200 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/chat/${friend.id}`)}
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                      {friend.profileImageUrl || friend.avatarUrl ? (
                        <img src={friend.profileImageUrl || friend.avatarUrl || ''} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <User className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {friend.displayName || friend.name}
                          </p>
                          {friend.isBot && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                              AI Bot
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {friend.unreadCount ? (
                            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                              {friend.unreadCount}
                            </span>
                          ) : null}
                          <span className="text-[11px] text-gray-400">
                            {formatTimestamp(friend.lastActivityAt)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {friend.lastMessage?.content || 'Tap to start chatting'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button className="p-2 bg-orange-50 text-orange-500 rounded-full hover:bg-orange-100 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
