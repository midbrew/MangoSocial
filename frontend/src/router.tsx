import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/auth/LoginPage';
import VerifyPage from './pages/auth/VerifyPage';
import ProfileSetupPage from './pages/onboarding/ProfileSetupPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />, // App will act as a layout or home
        children: [
            // We'll define child routes later if App is a layout
        ]
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
        element: <ProfileSetupPage />
    }
]);
