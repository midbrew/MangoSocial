import { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import { Users, Crown, Heart, MessageCircle, Flag, TrendingUp } from 'lucide-react';

interface DashboardData {
  overview: {
    users: number;
    premiumUsers: number;
    acceptedFriendships: number;
    messages: number;
    openReports: number;
  };
  analytics: {
    since: string;
    eventsByType: { _id: string; count: number }[];
    dailyEvents: { _id: string; count: number }[];
  };
}

export default function AdminOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-400">Failed to load dashboard data.</p>;
  }

  const stats = [
    { label: 'Total Users', value: data.overview.users, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Premium Users', value: data.overview.premiumUsers, icon: Crown, color: 'from-amber-500 to-orange-500' },
    { label: 'Friendships', value: data.overview.acceptedFriendships, icon: Heart, color: 'from-pink-500 to-rose-500' },
    { label: 'Messages', value: data.overview.messages, icon: MessageCircle, color: 'from-emerald-500 to-green-500' },
    { label: 'Open Reports', value: data.overview.openReports, icon: Flag, color: data.overview.openReports > 0 ? 'from-red-500 to-red-600' : 'from-slate-600 to-slate-700' },
  ];

  const maxDailyCount = Math.max(...(data.analytics.dailyEvents.map((d) => d.count)), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Key metrics for your MangoSocial platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Daily Activity (last 30 days)</h2>
        </div>
        {data.analytics.dailyEvents.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No events recorded yet</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {data.analytics.dailyEvents.slice(-30).map((day) => {
              const height = Math.max((day.count / maxDailyCount) * 100, 4);
              return (
                <div key={day._id} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day._id}: {day.count}
                  </div>
                  <div
                    className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-t hover:from-orange-400 hover:to-orange-300 transition-colors"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Events */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top Event Types</h2>
        <div className="space-y-3">
          {data.analytics.eventsByType.slice(0, 10).map((ev) => {
            const maxCount = data.analytics.eventsByType[0]?.count || 1;
            const width = (ev.count / maxCount) * 100;
            return (
              <div key={ev._id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-mono text-xs">{ev._id}</span>
                  <span className="text-slate-500 text-xs">{ev.count}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
