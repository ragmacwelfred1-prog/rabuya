// stores/authStore.ts
import { create } from 'zustand';
import api from '../services/api';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    phone_number?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    userType: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string, type: 'admin' | 'staff' | 'customer') => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    userType: localStorage.getItem('user_type'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        const storedUserType = localStorage.getItem('user_type');
        
        if (!token || !storedUserType) {
            set({
                isAuthenticated: false,
                user: null,
                token: null,
                userType: null,
                isLoading: false
            });
            return;
        }

        // Only check auth for admin routes
        if (storedUserType !== 'admin') {
            set({
                isAuthenticated: false,
                user: null,
                token: null,
                userType: null,
                isLoading: false
            });
            localStorage.removeItem('token');
            localStorage.removeItem('user_type');
            localStorage.removeItem('user');
            return;
        }

        set({ isLoading: true });
        
        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            const response = await api.get('/me');
            const userData = response.data;
            
            // ✅ FIX: Case-sensitive check - use lowercase
            if (userData.role !== 'admin') {
                throw new Error('User is not an admin');
            }
            
            localStorage.setItem('user', JSON.stringify(userData));
            
            set({
                user: userData,
                userType: userData.role,
                isAuthenticated: true,
                isLoading: false,
                error: null
            });
        } catch (error: any) {
            console.error('Check auth error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user_type');
            localStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];
            
            set({
                user: null,
                token: null,
                userType: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'Session expired. Please login again.'
            });
        }
    },

    login: async (email: string, password: string, type: 'admin' | 'staff' | 'customer') => {
        set({ isLoading: true, error: null });
        
        try {
            let response;
            
            if (type === 'admin') {
                response = await api.post('/login', { email, password });
            } else if (type === 'staff') {
                response = await api.post('/staff/login', { email, password });
            } else {
                response = await api.post('/customer/login', { email, password });
            }
            
            console.log('Login response:', response.data);
            
            // ✅ FIX: Get data from response correctly
            const { token, user, user_type, role, success } = response.data;
            
            // Determine the actual role (use user_type or role)
            const actualRole = user_type || user?.role || role;
            
            console.log('Actual role:', actualRole);
            console.log('Expected type:', type);
            
            // ✅ FIX: Case-insensitive role validation
            if (type === 'admin' && actualRole !== 'admin') {
                throw new Error('Access denied. Admin privileges required.');
            }
            
            if (type === 'staff' && actualRole !== 'staff') {
                throw new Error('Access denied. Staff privileges required.');
            }
            
            if (type === 'customer' && actualRole !== 'customer') {
                throw new Error('Access denied. Customer privileges required.');
            }
            
            // Store token and user data
            localStorage.setItem('token', token);
            localStorage.setItem('user_type', actualRole);
            localStorage.setItem('user', JSON.stringify(user));
            
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            set({
                user,
                token,
                userType: actualRole,
                isAuthenticated: true,
                isLoading: false,
                error: null
            });
            
            return { success: true, message: 'Login successful' };
            
        } catch (error: any) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed';
            if (error.response) {
                errorMessage = error.response.data?.message || error.response.data?.error || 'Invalid credentials';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            localStorage.removeItem('token');
            localStorage.removeItem('user_type');
            localStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];
            
            set({
                user: null,
                token: null,
                userType: null,
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage
            });
            
            return { success: false, message: errorMessage };
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_type');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        
        set({
            user: null,
            token: null,
            userType: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
        });
    },

    clearError: () => {
        set({ error: null });
    },

    setUser: (user: User | null) => {
        set({ user });
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
    }
}));

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (!error.config.url?.includes('/login') && 
                !error.config.url?.includes('/staff/login') &&
                !error.config.url?.includes('/customer/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user_type');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);