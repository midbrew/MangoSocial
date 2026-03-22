import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Home, Settings, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api, useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket.service';

interface NavItem {
    label: string;
    icon: typeof Home;
    path: string;
    badge?: number;
}

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mangoBadgeCount, setMangoBadgeCount] = useState(0);
    const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
    const { user } = useAuth();
    const userId = user?._id || user?.id;

    useEffect(() => {
        if (!userId) return;
        const fetchBadgeCount = async () => {
            try {
                const [friendsRes, requestsRes, notificationsRes] = await Promise.all([
                    api.get('/friends'),
                    api.get('/friends/requests'),
                    api.get('/notifications'),
                ]);
                const unreadMessages = friendsRes.data.reduce((sum: number, friend: any) => sum + (friend.unreadCount || 0), 0);
                const pendingRequests = requestsRes.data.length;
                const unreadNotifications = notificationsRes.data.filter((notification: any) => !notification.read).length;
                setMangoBadgeCount(unreadMessages + pendingRequests);
                setNotificationBadgeCount(unreadNotifications);
            } catch {
                // ignore
            }
        };
        fetchBadgeCount();
    }, [location.pathname, userId]);

    // Live notification updates via socket
    useEffect(() => {
        if (!userId) return;

        const socket = socketService.connect(userId);

        const onNewNotification = () => {
            setNotificationBadgeCount((prev) => prev + 1);
        };

        socket.on('new-notification', onNewNotification);

        return () => {
            socket.off('new-notification', onNewNotification);
        };
    }, [userId]);

    const navItems: NavItem[] = [
        { label: 'Home', icon: Home, path: '/' },
        { label: 'Mangoes', icon: Users, path: '/friends', badge: mangoBadgeCount },
        { label: 'Notifications', icon: Bell, path: '/notifications', badge: notificationBadgeCount },
        { label: 'Settings', icon: Settings, path: '/settings' },
    ];

    // Don't show on certain pages
    const hiddenPaths = ['/login', '/verify', '/profile-setup', '/queue', '/call', '/bot-call', '/post-call', '/ai-practice/', '/chat/'];
    const shouldHide = hiddenPaths.some(p => 
        p.endsWith('/') ? location.pathname.startsWith(p) : location.pathname === p
    );
    if (shouldHide) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
            <div className="max-w-lg mx-auto flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute top-0 w-8 h-0.5 bg-orange-500 rounded-full"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div className="relative">
                                <Icon
                                    className={`w-5 h-5 transition-colors ${
                                        isActive ? 'text-orange-500' : 'text-gray-400'
                                    }`}
                                />
                                {item.badge && item.badge > 0 ? (
                                    <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </div>
                            <span
                                className={`text-[10px] font-medium transition-colors ${
                                    isActive ? 'text-orange-500' : 'text-gray-400'
                                }`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
