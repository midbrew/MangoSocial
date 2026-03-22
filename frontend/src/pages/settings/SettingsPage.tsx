import { ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, FileText, LogOut, Shield, Trash2, User } from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { user, logout, refreshUser } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [avatarError, setAvatarError] = useState('');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        setAvatarError('');

        try {
            const formData = new FormData();
            formData.append('image', file);

            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            const uploadResponse = await fetch(`${API_URL}/upload/image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const uploadData = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploadData.error || 'Upload failed');

            await api.put('/user/avatar', { avatarUrl: uploadData.imageUrl });
            await refreshUser();
        } catch (error: any) {
            setAvatarError(error.message || 'Failed to upload avatar');
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true);
        try {
            await api.delete('/user/me');
            logout();
            navigate('/login');
        } catch (error) {
            console.error(error);
            setIsDeletingAccount(false);
        }
    };

    const menuItems = [
        {
            icon: User,
            label: 'Edit Profile',
            description: 'Update your name, interests, and preferences',
            onClick: () => navigate('/profile-setup'),
        },
        {
            icon: FileText,
            label: 'Terms of Service',
            description: 'Read our terms and conditions',
            onClick: () => navigate('/terms'),
        },
        {
            icon: Shield,
            label: 'Privacy Policy',
            description: 'How we handle your data',
            onClick: () => navigate('/privacy'),
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
            <header className="p-4 flex items-center gap-4 border-b border-gray-100">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="font-bold text-gray-900 text-lg">Settings</h1>
            </header>

            <main className="px-6 py-6 max-w-lg mx-auto space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user?.profile.avatarUrl ? (
                                <img
                                    src={user.profile.avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-2xl">🥭</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="font-semibold text-gray-900 truncate">
                                {user?.profile.name || 'User'}
                            </h2>
                            <p className="text-sm text-gray-500 truncate">{user?.phone}</p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                            className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600 hover:bg-orange-100 disabled:opacity-60"
                        >
                            <Camera className="w-4 h-4 inline mr-2" />
                            {isUploadingAvatar ? 'Uploading avatar...' : 'Change Avatar'}
                        </button>
                        {avatarError && (
                            <p className="text-sm text-red-500">{avatarError}</p>
                        )}
                    </div>
                </motion.div>

                <div className="space-y-2">
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <motion.button
                                key={item.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={item.onClick}
                                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 text-left hover:border-orange-200 transition-colors"
                            >
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                <div className="space-y-2 pt-4">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 text-left hover:border-red-200 transition-colors"
                    >
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <LogOut className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="font-medium text-red-600 text-sm">Log Out</p>
                    </button>

                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 text-left hover:border-red-200 transition-colors"
                    >
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <p className="font-medium text-red-600 text-sm">Delete Account</p>
                            <p className="text-xs text-gray-500">This action cannot be undone</p>
                        </div>
                    </button>
                </div>

                <p className="text-center text-xs text-gray-400 pt-4">
                    MangoSocial v1.0.0
                </p>
            </main>

            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
                    >
                        <h2 className="text-lg font-bold text-gray-900">Log out?</h2>
                        <p className="text-sm text-gray-500">
                            Are you sure you want to log out of MangoSocial?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                            >
                                Log Out
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl"
                    >
                        <h2 className="text-lg font-bold text-gray-900">Delete Account?</h2>
                        <p className="text-sm text-gray-500">
                            This will permanently delete your account, all your Mangoes, messages, and history. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeletingAccount}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60"
                            >
                                {isDeletingAccount ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
