/**
 * API Client Utility
 * Wraps the native fetch API to automatically handle sending Authorization headers
 * and intercepting 401 Unauthorized responses to seamlessly rotate standard Access Tokens
 * with secure HTTP-Only Refresh Cookies.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiClient = async (endpoint: string, options: FetchOptions = {}) => {
  const { requiresAuth = true, ...customConfig } = options;
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customConfig.headers as Record<string, string>),
  };

  if (requiresAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers,
  };

  let response = await fetch(`${API_URL}${endpoint}`, config);

  // If the server tells us our 15-minute Access Token is dead...
  if (response.status === 401 && requiresAuth) {
    // Attempt to silently refresh it using our secure HTTP-only refresh cookie
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        // Critical: Must include credentials for cookies to be sent cross-origin
        credentials: 'include' 
      });

      if (refreshResponse.ok) {
        const { token: newToken } = await refreshResponse.json();
        // Save the fresh token
        localStorage.setItem('token', newToken);
        
        // Update the header and retry the original failed request
        headers['Authorization'] = `Bearer ${newToken}`;
        config.headers = headers;
        
        response = await fetch(`${API_URL}${endpoint}`, config);
      } else {
        // The refresh token is also dead (or missing). Total logout required.
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login'; // Force them to login
      }
    } catch (e) {
      console.error('Failed to refresh session token:', e);
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  }

  return response;
};
