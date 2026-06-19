import { create } from 'zustand';
import client from '../api/client';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isServerOffline: false,
  hamburgerProgress: 0,

  setServerOffline: (isOffline) => set({ isServerOffline: isOffline }),
  
  setHamburgerProgress: (progress) => set((state) => {
    if (state.user) {
      localStorage.setItem(`hamburger_override_${state.user.username}`, progress);
    }
    return { hamburgerProgress: progress };
  }),
  
  checkAuth: async (background = false) => {
    if (!background) set({ isLoading: true });
    try {
      const response = await client.get('/user/api/auth/status', { timeout: 10000 });
      if (response.data.data.logged_in) {
        const user = response.data.data.user;
        const completedChallenges = user.completed_challenges_count ?? 0;
        const savedOverride = localStorage.getItem(`hamburger_override_${user.username}`);
        const progress = savedOverride !== null ? parseFloat(savedOverride) : Math.min(completedChallenges / 10, 1.0);
        
        set({ 
          user, 
          isAuthenticated: true, 
          isServerOffline: false,
          hamburgerProgress: progress 
        });
      } else {
        set({ user: null, isAuthenticated: false, isServerOffline: false, hamburgerProgress: 0 });
      }
    } catch (error) {
      const isOffline = !error.response || [502, 503, 504].includes(error.response.status);
      set({ user: null, isAuthenticated: false, isServerOffline: isOffline, hamburgerProgress: 0 });
    } finally {
      if (!background) set({ isLoading: false });
    }
  },
  
  login: async (username, password) => {
    try {
      const response = await client.post('/user/login', { username, password });
      const user = response.data.user;
      const completedChallenges = user.completed_challenges_count ?? 0;
      const savedOverride = localStorage.getItem(`hamburger_override_${user.username}`);
      const progress = savedOverride !== null ? parseFloat(savedOverride) : Math.min(completedChallenges / 10, 1.0);

      set({ 
        user, 
        isAuthenticated: true,
        hamburgerProgress: progress
      });
      return { 
        success: true, 
        awarded_duck: response.data.awarded_duck,
        role: user.role
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
      set({ user: null, isAuthenticated: false, hamburgerProgress: 0 });
    }
  },
  
  completeTutorial: async () => {
    try {
      await client.post('/user/api/auth/tutorial/complete');
      set((state) => ({ user: { ...state.user, has_seen_tutorial: true } }));
    } catch (error) {
      console.error('Failed to complete tutorial', error);
    }
  },
}));

export default useAuthStore;
