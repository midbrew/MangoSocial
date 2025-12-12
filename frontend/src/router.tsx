import { createBrowserRouter } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import VerifyPage from './pages/auth/VerifyPage';
import ProfileSetupPage from './pages/onboarding/ProfileSetupPage';
import HomePage from './pages/HomePage';
import AiPracticePage from './pages/ai/AiPracticePage';
import AiChatPage from './pages/ai/AiChatPage';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
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
    }
]);
