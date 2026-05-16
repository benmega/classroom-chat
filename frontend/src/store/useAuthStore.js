import { create } from 'zustand';
import client from '../api/client';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await client.get('/user/api/auth/status', { timeout: 10000 });
      if (response.data.data.logged_in) {
        set({ user: response.data.data.user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
  
  login: async (username, password) => {
    try {
      const response = await client.post('/user/login', { username, password });
      set({ user: response.data.user, isAuthenticated: true });
      return { success: true, awarded_duck: response.data.awarded_duck };
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
