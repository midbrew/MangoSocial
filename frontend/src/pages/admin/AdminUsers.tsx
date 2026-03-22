import { useEffect, useState } from 'react';
import { api } from '../../context/AuthContext';
import { Search, Crown, Ban, Trash2, Shield } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  phoneNumber: string;
  isPremium: boolean;
  reputationScore: number;
  canMatchHumans: boolean;
  isAdmin: boolean;
  unreadNotifications: number;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    api.get('/admin/users')
      .then((res) => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const toggleBan = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await api.put(`/admin/users/${userId}/ban`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, canMatchHumans: res.data.canMatchHumans } : u))
      );
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const togglePremium = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await api.put(`/admin/users/${userId}/premium`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isPremium: res.data.isPremium } : u))
      );
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user and all their data?')) return;
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.phoneNumber.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 w-72"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">User</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Phone</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Premium</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Rep</th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Joined</th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{user.name}</span>
                    {user.isAdmin && (
                      <Shield className="w-3.5 h-3.5 text-orange-400" />
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-slate-400 font-mono">{user.phoneNumber}</span>
                </td>
                <td className="px-5 py-3 text-center">
                  {user.isPremium ? (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">Free</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-sm font-medium ${
                    user.reputationScore >= 80 ? 'text-emerald-400' :
                    user.reputationScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {user.reputationScore}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  {user.canMatchHumans ? (
                    <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" title="Active" />
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Banned
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => togglePremium(user.id)}
                      disabled={actionLoading === user.id}
                      title={user.isPremium ? 'Remove premium' : 'Grant premium'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        user.isPremium
                          ? 'text-amber-400 hover:bg-amber-500/10'
                          : 'text-slate-500 hover:bg-slate-700 hover:text-amber-400'
                      } disabled:opacity-30`}
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleBan(user.id)}
                      disabled={actionLoading === user.id || user.isAdmin}
                      title={user.canMatchHumans ? 'Ban user' : 'Unban user'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        !user.canMatchHumans
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-slate-500 hover:bg-slate-700 hover:text-red-400'
                      } disabled:opacity-30`}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      disabled={actionLoading === user.id || user.isAdmin}
                      title="Delete user"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-600">
                  {search ? 'No users match your search.' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
