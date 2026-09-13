import { create } from 'zustand';
import client from '../api/client';

// ---------------------------------------------------------------------------
// Private helpers — centralise hamburger_override localStorage access so the
// key string and parsing logic live in exactly one place.
// ---------------------------------------------------------------------------
const getHamburgerOverride = (username) => {
  const val = localStorage.getItem(`hamburger_override_${username}`);
  return val !== null ? parseFloat(val) : null;
};

const setHamburgerOverride = (username, progress) => {
  localStorage.setItem(`hamburger_override_${username}`, progress);
};

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isServerOffline: false,
  hamburgerProgress: 0,
  unreadCount: 0,
  lastReadMessageId: null,
  activityUnreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: count }),
  setLastReadMessageId: (id) => set({ lastReadMessageId: id }),
  setActivityUnreadCount: (count) => set({ activityUnreadCount: count }),

  setServerOffline: (isOffline) => set({ isServerOffline: isOffline }),
  
  setHamburgerProgress: (progress) => set((state) => {
    if (state.user) {
      setHamburgerOverride(state.user.username, progress);
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
        const savedOverride = getHamburgerOverride(user.username);
        const progress = savedOverride !== null ? savedOverride : Math.min(completedChallenges / 10, 1.0);
        
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
      const savedOverride = getHamburgerOverride(user.username);
      const progress = savedOverride !== null ? savedOverride : Math.min(completedChallenges / 10, 1.0);

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
