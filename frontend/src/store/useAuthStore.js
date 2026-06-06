import { create } from 'zustand';
import client from '../api/client';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isServerOffline: false,

  setServerOffline: (isOffline) => set({ isServerOffline: isOffline }),
  
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await client.get('/user/api/auth/status', { timeout: 10000 });
      if (response.data.data.logged_in) {
        set({ user: response.data.data.user, isAuthenticated: true, isServerOffline: false });
      } else {
        set({ user: null, isAuthenticated: false, isServerOffline: false });
      }
    } catch (error) {
      const isOffline = !error.response || [502, 503, 504].includes(error.response.status);
      set({ user: null, isAuthenticated: false, isServerOffline: isOffline });
    } finally {
      set({ isLoading: false });
    }
  },
  
  login: async (username, password) => {
    try {
      const response = await client.post('/user/login', { username, password });
      set({ user: response.data.user, isAuthenticated: true });
      return { 
        success: true, 
        awarded_duck: response.data.awarded_duck,
        role: response.data.user.role
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  },

  loginParentCognito: async (email, password) => {
    try {
      const response = await client.post('/api/auth/cognito/login', { email, password });
      if (response.data.success) {
        // Since cognito login sets the session cookie, we checkAuth to populate the user
        await useAuthStore.getState().checkAuth();
        return { 
          success: true,
          role: response.data.role
        };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  },
  
  logout: async () => {
    try {
      await client.get('/user/logout');
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export default useAuthStore;
