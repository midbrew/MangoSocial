import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: {
    partnerId?: string;
  };
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await apiClient('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifs();
    // In a real app, you would also listen to socket events here:
    // socket.on('new-notification', fetchNotifs);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    await apiClient('/notifications/read-all', { method: 'PUT' });
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-800 rounded-xl shadow-lg border border-zinc-700 overflow-hidden z-50">
          <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
            <h3 className="text-white font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-zinc-400">No notifications yet.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif._id} 
                  className={`p-4 border-b border-zinc-700 hover:bg-zinc-700/50 transition-colors ${!notif.read ? 'bg-zinc-700/20' : ''}`}
                >
                  <p className="text-sm font-semibold text-white">{notif.title}</p>
                  <p className="text-xs text-zinc-400 mt-1">{notif.body}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
