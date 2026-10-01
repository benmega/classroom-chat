import { create } from 'zustand';
import toast from 'react-hot-toast';
import client from '../api/client';
import { resetSocket } from '../hooks/useChatSocket';

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

const useAuthStore = create((set, get) => ({
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
      const body = error.response?.data;
      const serverError = typeof body === 'string' ? body : body?.error;
      return { 
        success: false, 
        error: (typeof serverError === 'string' && serverError) || 'Login failed' 
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
  
  // The one definition of "signed out": the user and everything derived from them
  clearSession: () => set({
    user: null,
    isAuthenticated: false,
    hamburgerProgress: 0,
    unreadCount: 0,
    lastReadMessageId: null,
    activityUnreadCount: 0,
  }),

  logout: async () => {
    try {
      await client.get('/user/logout');
    } catch (error) {
      // Sign out locally regardless: callers navigate away afterwards, so they must not get a rejection.
      // The server may still hold the session though, which a reload would pick up again.
      console.warn('Logout request failed; clearing the local session anyway', error);
      toast.error('Could not end your session on the server. You may still be signed in after a reload.');
    } finally {
      // The next login must handshake a fresh socket, not reuse this user's
      resetSocket();
      get().clearSession();
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

// However the session ends (logout, a 401, a failed auth check), the chat socket it opened must go too
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated && !state.isAuthenticated) resetSocket();
});

export default useAuthStore;
