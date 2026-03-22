import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface User {
    id?: string;
    _id?: string;
    phone: string;
    profile: {
        name?: string;
        gender?: string;
        birthdate?: string;
        starSign?: string;
        bio?: string;
        avatarUrl?: string;
    };
    interests: {
        type: 'predefined' | 'custom';
        value: string;
        category?: string;
    }[];
    matchingPreferences: {
        genderPreference: string[];
        useStarSignMatching: boolean;
    };
    premiumStatus: {
        isPremium: boolean;
        expiresAt?: string | null;
    };
    isOnboarded: boolean;
    canMatchHumans: boolean;
    aiSessionsCompleted: number;
    reputationScore?: number;
    isAdmin?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Axios instance with auth header and cookie support
export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Send httpOnly cookies for refresh token
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let hasLoggedOut = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (token) prom.resolve(token);
        else prom.reject(error);
    });
    failedQueue = [];
};

const forceLogout = () => {
    if (hasLoggedOut) return;
    hasLoggedOut = true;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Never try to refresh if we've already decided to log out
        if (hasLoggedOut) return Promise.reject(error);

        // Only attempt refresh for 401 errors from non-auth endpoints
        if (
            error.response?.status !== 401 ||
            originalRequest._retry ||
            originalRequest.url?.includes('/auth/')
        ) {
            return Promise.reject(error);
        }

        // No point refreshing if there's no token (user never logged in)
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    },
                    reject,
                });
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
            const newToken = data.token;
            localStorage.setItem('token', newToken);
            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            forceLogout();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            
            if (storedToken) {
                setToken(storedToken);
                try {
                    // Fetch fresh user data
                    const response = await api.get('/user/me');
                    setUser(response.data.user);
                } catch (error) {
                    // Token invalid — try refresh (interceptor handles it)
                    console.error('Failed to fetch user:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                }
            } else {
                // No stored token, but httpOnly refresh cookie might still be valid
                try {
                    const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                        setToken(data.token);
                        const response = await api.get('/user/me');
                        setUser(response.data.user);
                    }
                } catch {
                    // No valid refresh token either — stay logged out
                }
            }
            
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Best-effort cookie clear
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const refreshUser = async () => {
        if (token) {
            try {
                const response = await api.get('/user/me');
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            } catch (error) {
                console.error('Failed to refresh user:', error);
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!token && !!user,
                login,
                logout,
                updateUser,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
