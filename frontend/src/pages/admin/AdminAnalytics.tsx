import { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import { BarChart3, Activity } from 'lucide-react';

interface AnalyticsData {
  since: string;
  eventsByType: { _id: string; count: number }[];
  dailyEvents: { _id: string; count: number }[];
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics?days=${selectedRange}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedRange]);

  const totalEvents = data?.eventsByType.reduce((sum, e) => sum + e.count, 0) || 0;
  const avgDaily = data?.dailyEvents.length
    ? Math.round(totalEvents / data.dailyEvents.length)
    : 0;
  const peakDay = data?.dailyEvents.reduce((max, d) => (d.count > max.count ? d : max), { _id: '-', count: 0 });
  const maxDailyCount = Math.max(...(data?.dailyEvents.map((d) => d.count) || [1]), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Event tracking and usage metrics</p>
        </div>
        <div className="flex gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
          {RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setSelectedRange(range.days)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedRange === range.days
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-slate-400">Failed to load analytics.</p>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium uppercase">Total Events</p>
              <p className="text-3xl font-bold text-white mt-1">{totalEvents.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium uppercase">Avg/Day</p>
              <p className="text-3xl font-bold text-white mt-1">{avgDaily.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium uppercase">Peak Day</p>
              <p className="text-3xl font-bold text-white mt-1">{peakDay?.count.toLocaleString()}</p>
              <p className="text-xs text-slate-600 mt-0.5">{peakDay?._id}</p>
            </div>
          </div>

          {/* Daily Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Daily Events</h2>
            </div>
            {data.dailyEvents.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No data for this period</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-end gap-[3px] h-48">
                  {data.dailyEvents.map((day) => {
                    const height = Math.max((day.count / maxDailyCount) * 100, 2);
                    return (
                      <div key={day._id} className="flex-1 flex flex-col items-center group relative">
                        <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {day._id}: {day.count} events
                        </div>
                        <div
                          className="w-full bg-gradient-to-t from-orange-500 to-orange-400 rounded-sm hover:from-orange-400 hover:to-yellow-400 transition-all cursor-default"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>{data.dailyEvents[0]?._id}</span>
                  <span>{data.dailyEvents[data.dailyEvents.length - 1]?._id}</span>
                </div>
              </div>
            )}
          </div>

          {/* Events by Type */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Events by Type</h2>
            </div>
            {data.eventsByType.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No events recorded</p>
            ) : (
              <div className="space-y-3">
                {data.eventsByType.map((ev) => {
                  const pct = totalEvents > 0 ? ((ev.count / totalEvents) * 100).toFixed(1) : '0';
                  const barWidth = (ev.count / (data.eventsByType[0]?.count || 1)) * 100;
                  return (
                    <div key={ev._id} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-300 font-mono text-xs">{ev._id}</span>
                        <span className="text-slate-500 text-xs">
                          {ev.count.toLocaleString()} <span className="text-slate-700">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-gradient-to-r from-orange-500 to-pink-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
