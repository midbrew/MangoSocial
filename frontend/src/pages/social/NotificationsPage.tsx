import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, MessageCircle, Sparkles, Trash2, UserPlus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../context/AuthContext';

interface Notification {
    _id: string;
    type: 'friend_request' | 'friend_accepted' | 'match' | 'message';
    title: string;
    body: string;
    read: boolean;
    relatedId?: string;
    data?: {
        partnerId?: string;
        friendshipId?: string;
    };
    createdAt: string;
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
        } catch (error) {
            console.error(error);
        }
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications((prev) => prev.filter((n) => n._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const clearAll = async () => {
        try {
            await api.delete('/notifications');
            setNotifications([]);
        } catch (error) {
            console.error(error);
        }
    };

    const openNotification = async (notification: Notification) => {
        try {
            if (!notification.read) {
                await api.put(`/notifications/${notification._id}/read`);
                setNotifications((prev) => prev.map((item) => item._id === notification._id ? { ...item, read: true } : item));
            }

            const partnerId = notification.data?.partnerId || notification.relatedId;
            if (!partnerId) return;

            if (notification.type === 'message' || notification.type === 'match' || notification.type === 'friend_accepted') {
                navigate(`/chat/${partnerId}`);
                return;
            }

            if (notification.type === 'friend_request') {
                navigate('/friends');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'friend_request':
                return <UserPlus className="w-4 h-4" />;
            case 'friend_accepted':
                return <Check className="w-4 h-4" />;
            case 'match':
                return <Sparkles className="w-4 h-4" />;
            case 'message':
                return <MessageCircle className="w-4 h-4" />;
            default:
                return <Bell className="w-4 h-4" />;
        }
    };

    const getIconColor = (type: Notification['type']) => {
        switch (type) {
            case 'friend_request':
                return 'bg-orange-100 text-orange-500';
            case 'friend_accepted':
                return 'bg-green-100 text-green-500';
            case 'match':
                return 'bg-pink-100 text-pink-500';
            case 'message':
                return 'bg-blue-100 text-blue-500';
            default:
                return 'bg-gray-100 text-gray-500';
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const unreadCount = notifications.filter((notification) => !notification.read).length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
            <header className="p-4 flex items-center gap-4 border-b border-gray-100 bg-white">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="font-bold text-gray-900 text-lg">Notifications</h1>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="text-sm text-orange-500 font-medium hover:text-orange-600"
                    >
                        Mark all read
                    </button>
                )}
                {notifications.length > 0 && (
                    <button
                        onClick={clearAll}
                        className="text-sm text-red-400 font-medium hover:text-red-500 flex items-center gap-1"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                )}
            </header>

            <main className="px-4 py-4 max-w-lg mx-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20 space-y-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <Bell className="w-7 h-7 text-gray-400" />
                        </div>
                        <p className="text-gray-500">No notifications yet</p>
                        <p className="text-sm text-gray-400">
                            You&apos;ll see matches, requests, and new messages here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notification, index) => (
                            <motion.button
                                key={notification._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => openNotification(notification)}
                                className={`w-full p-4 rounded-2xl flex items-start gap-3 transition-colors text-left group ${
                                    notification.read
                                        ? 'bg-white border border-gray-100'
                                        : 'bg-orange-50 border border-orange-100'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {notification.body}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-1">
                                        {formatTime(notification.createdAt)}
                                    </p>
                                </div>
                                {!notification.read && (
                                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2" />
                                )}
                                <button
                                    onClick={(e) => deleteNotification(notification._id, e)}
                                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </motion.button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
