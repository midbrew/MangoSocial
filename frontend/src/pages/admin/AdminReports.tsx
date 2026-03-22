import { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import { CheckCircle, Clock, Eye, Ban } from 'lucide-react';

interface Report {
  _id: string;
  reporter: { _id: string; profile?: { name?: string }; phoneNumber: string };
  reportedUser: { _id: string; profile?: { name?: string }; phoneNumber: string; reputationScore?: number };
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-400',
  reviewed: 'bg-blue-500/10 text-blue-400',
  resolved: 'bg-emerald-500/10 text-emerald-400',
};

const statusIcons: Record<string, JSX.Element> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  reviewed: <Eye className="w-3.5 h-3.5" />,
  resolved: <CheckCircle className="w-3.5 h-3.5" />,
};

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/reports')
      .then((res) => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (reportId: string, status: string) => {
    setActionLoading(reportId);
    try {
      const res = await api.put(`/admin/reports/${reportId}`, { status });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: res.data.status } : r))
      );
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const banUser = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/ban`);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter);

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewed: reports.filter((r) => r.status === 'reviewed').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">{counts.pending} pending report{counts.pending !== 1 ? 's' : ''} requiring review</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'reviewed', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                : 'text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-2 text-xs opacity-60">{counts[status]}</span>
          </button>
        ))}
      </div>

      {/* Reports List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-emerald-500/30 mx-auto" />
          <p className="text-slate-500 text-sm mt-3">
            {statusFilter === 'all' ? 'No reports yet' : `No ${statusFilter} reports`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${statusColors[report.status]}`}>
                      {statusIcons[report.status]}
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white capitalize">{report.reason.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/40 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reporter</p>
                  <p className="text-sm text-white">{report.reporter?.profile?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 font-mono">{report.reporter?.phoneNumber}</p>
                </div>
                <div className="bg-slate-800/40 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reported User</p>
                  <p className="text-sm text-white">{report.reportedUser?.profile?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 font-mono">{report.reportedUser?.phoneNumber}</p>
                  {report.reportedUser?.reputationScore != null && (
                    <p className={`text-xs mt-0.5 ${
                      report.reportedUser.reputationScore >= 80 ? 'text-emerald-400' :
                      report.reportedUser.reputationScore >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      Rep: {report.reportedUser.reputationScore}
                    </p>
                  )}
                </div>
              </div>

              {report.description && (
                <div className="bg-slate-800/30 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-400 leading-relaxed">{report.description}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {report.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(report._id, 'reviewed')}
                    disabled={actionLoading === report._id}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    Mark Reviewed
                  </button>
                )}
                {report.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(report._id, 'resolved')}
                    disabled={actionLoading === report._id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
                <button
                  onClick={() => banUser(report.reportedUser._id)}
                  disabled={actionLoading === report._id}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Ban className="w-3 h-3" /> Ban User
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
