import { createBrowserRouter } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import VerifyPage from './pages/auth/VerifyPage';
import ProfileSetupPage from './pages/onboarding/ProfileSetupPage';
import HomePage from './pages/HomePage';
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
    }
]);
