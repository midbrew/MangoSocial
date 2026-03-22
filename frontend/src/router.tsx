import { createBrowserRouter } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import VerifyPage from './pages/auth/VerifyPage';
import ProfileSetupPage from './pages/onboarding/ProfileSetupPage';
import HomePage from './pages/HomePage';
import AiPracticePage from './pages/ai/AiPracticePage';
import AiChatPage from './pages/ai/AiChatPage';
import QueuePage from './pages/call/QueuePage';
import CallRoomPage from './pages/call/CallRoomPage';
import BotCallPage from './pages/call/BotCallPage';
import PostCallPage from './pages/call/PostCallPage';
import FriendsListPage from './pages/social/FriendsListPage';
import ProfileViewPage from './pages/social/ProfileViewPage';
import ChatPage from './pages/social/ChatPage';
import NotificationsPage from './pages/social/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Admin pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';

export const router = createBrowserRouter([
    {
        element: <AppLayout />,
        children: [
            {
                path: '/',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <HomePage />
                    </ProtectedRoute>
                ),
            },
            {
                path: '/login',
                element: <LoginPage />
            },
            {
                path: '/verify',
                element: <VerifyPage />
            },
            {
                path: '/profile-setup',
                element: (
                    <ProtectedRoute>
                        <ProfileSetupPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/ai-practice',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <AiPracticePage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/ai-practice/:scenarioId',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <AiChatPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/queue',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <QueuePage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/call',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <CallRoomPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/post-call',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <PostCallPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/bot-call',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <BotCallPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/friends',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <FriendsListPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/profile/:id',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <ProfileViewPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/chat/:id',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <ChatPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/settings',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <SettingsPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/notifications',
                element: (
                    <ProtectedRoute requireOnboarding>
                        <NotificationsPage />
                    </ProtectedRoute>
                )
            },
            {
                path: '/terms',
                element: <TermsPage />
            },
            {
                path: '/privacy',
                element: <PrivacyPage />
            },
            {
                path: '*',
                element: <NotFoundPage />
            }
        ]
    },
    {
        path: '/admin',
        element: (
            <ProtectedRoute requireOnboarding>
                <AdminLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <AdminOverview /> },
            { path: 'users', element: <AdminUsers /> },
            { path: 'reports', element: <AdminReports /> },
            { path: 'analytics', element: <AdminAnalytics /> },
            { path: 'settings', element: <AdminSettings /> },
        ],
    },
]);
