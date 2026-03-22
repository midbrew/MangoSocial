import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ShieldAlert, Crown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function ProfileViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');
  
  const myUserId = user?._id || user?.id || null;
  const isOwnProfile = id === myUserId;

  const togglePremium = async () => {
    try {
        const token = localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/user/premium/toggle`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setProfile({ ...profile, premiumStatus: { ...profile.premiumStatus, isPremium: data.isPremium }});
        }
    } catch (e) { console.error(e) }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/user/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
        } else {
          setError('Profile restricted or user not found. You must be friends to view this profile.');
        }
      } catch (e) {
        setError('Server error.');
      }
    };
    fetchProfile();
  }, [id]);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await fetch(`${API_URL}/connections/report`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            targetUserId: id,
            reason: reportReason,
            description: reportDesc
        })
      });
      alert('User has been blocked and reported.');
      navigate('/friends');
    } catch (err) {
      console.error(err);
      alert('Error submitting report.');
    }
  };

  if (error) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <ShieldAlert className="w-16 h-16 text-rose-500" />
              <h2 className="text-2xl font-bold text-white">Access Denied</h2>
              <p className="text-slate-400 max-w-sm">{error}</p>
              <button onClick={() => navigate('/friends')} className="px-6 py-2 mt-4 text-indigo-400 bg-indigo-500/10 rounded-full hover:bg-indigo-500/20">Go Back</button>
          </div>
      );
  }

  if (!profile) return <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center">Loading...</div>;

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-slate-950 p-6 pt-24 text-white"
    >
      <div className="max-w-md mx-auto space-y-8">
        
        <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                {profile.profile?.avatarUrl ? <img src={profile.profile.avatarUrl} className="w-full h-full rounded-full" /> : <User className="w-12 h-12" />}
            </div>
            <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{profile.profile?.name || 'Anonymous User'}</h1>
                    {profile.premiumStatus?.isPremium && <Crown className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />}
                </div>
                <p className="text-indigo-400 text-lg">{profile.profile?.starSign} • {profile.profile?.gender}</p>
                {isOwnProfile && (
                    <button onClick={togglePremium} className="mt-3 text-xs font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-4 py-2 rounded-full hover:bg-yellow-500/20 transition-colors">
                        {profile.premiumStatus?.isPremium ? 'Revert to Free' : 'Admin: Upgrade Premium'}
                    </button>
                )}
            </div>
        </div>

        {profile.profile?.bio && (
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800">
                <h3 className="font-medium text-slate-400 mb-2 text-sm uppercase tracking-wider">About</h3>
                <p className="text-slate-200 leading-relaxed text-lg">{profile.profile.bio}</p>
            </div>
        )}

        <div className="space-y-3">
            <h3 className="font-medium text-slate-400 text-sm uppercase tracking-wider px-2">Interests</h3>
            <div className="flex flex-wrap gap-2">
                {profile.interests?.map((interest: any, index: number) => (
                    <span key={index} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-full text-slate-200 shadow-sm">
                        {interest.value}
                    </span>
                ))}
            </div>
        </div>

        <div className="pt-8 flex justify-center">
            {!isOwnProfile && (
                <button onClick={() => setShowReportModal(true)} className="flex items-center justify-center gap-2 w-full max-w-xs px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium rounded-full transition-colors">
                    <ShieldAlert className="w-5 h-5" /> Block & Report User
                </button>
            )}
        </div>

      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-6"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex flex-row items-center gap-2"><ShieldAlert className="text-red-500"/> Report User</h2>
                    <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white"><X /></button>
                </div>
                
                <form onSubmit={handleReport} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Reason</label>
                        <select 
                            value={reportReason} 
                            onChange={(e) => setReportReason(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="spam">Spam / Bots</option>
                            <option value="harassment">Harassment</option>
                            <option value="inappropriate">Inappropriate Content</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
                        <textarea 
                            value={reportDesc} 
                            onChange={(e) => setReportDesc(e.target.value)}
                            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                            placeholder="Please provide more details..."
                        />
                    </div>

                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-colors">
                        Submit Report & Block
                    </button>
                </form>
            </motion.div>
        </div>
      )}

    </motion.div>
  );
}
