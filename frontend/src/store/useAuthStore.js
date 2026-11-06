import { create } from 'zustand';
import toast from 'react-hot-toast';
import client from '../api/client';
import { resetSocket } from '../hooks/useChatSocket';
import { getErrorMessage } from '../utils/apiError';


const getHamburgerOverride = (username) => {
  const val = localStorage.getItem(`hamburger_override_${username}`);
  return val !== null ? parseFloat(val) : null;
};

const setHamburgerOverride = (username, progress) => {
  localStorage.setItem(`hamburger_override_${username}`, progress);
};

// Signing out is a POST. A backend from before that switch answers it with 405 and still serves
// the deprecated GET, so fall back to that once; remove together with the GET route next release.
const endServerSession = async () => {
  try {
    await client.post('/user/logout');
  } catch (error) {
    if (error.response?.status !== 405) throw error;
    await client.get('/user/logout');
  }
};

// What /user/api/auth/status says about the session, as the store state it implies
const sessionFromStatus = ({ logged_in: loggedIn, user }) => {
  if (!loggedIn) {
    return { user: null, isAuthenticated: false, isServerOffline: false, hamburgerProgress: 0 };
  }
  const completedChallenges = user.completed_challenges_count ?? 0;
  const savedOverride = getHamburgerOverride(user.username);
  const progress = savedOverride !== null ? savedOverride : Math.min(completedChallenges / 10, 1.0);
  return { user, isAuthenticated: true, isServerOffline: false, hamburgerProgress: progress };
};

const fetchAuthStatus = async () => {
  const response = await client.get('/user/api/auth/status', { timeout: 10000 });
  return response.data.data;
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
  
  // The session check: App on mount, the dev login and the server-offline page. It is the only call
  // that may declare the server unreachable, and (unless background) it puts the app behind the loader.
  checkAuth: async (background = false) => {
    if (!background) set({ isLoading: true });
    try {
      set(sessionFromStatus(await fetchAuthStatus()));
    } catch (error) {
      const isOffline = !error.response || [502, 503, 504].includes(error.response.status);
      set({ user: null, isAuthenticated: false, isServerOffline: isOffline, hamburgerProgress: 0 });
    } finally {
      if (!background) set({ isLoading: false });
    }
  },

  // Re-reads the signed-in user (duck balance, profile, perks) after something changed it. Unlike
  // checkAuth it never shows the loader and a failure changes nothing: a blip or a timeout says nothing
  // about the session, and a session that really ended is already cleared by the 401 interceptor.
  // A server that answers "not logged in" is a real answer, so that one still signs the user out.
  refreshUser: async () => {
    const wasAuthenticated = get().isAuthenticated;
    try {
      const session = sessionFromStatus(await fetchAuthStatus());
      // The session changed while the request was out (a logout, a login): this answer is about the old one
      if (get().isAuthenticated !== wasAuthenticated) return;
      set(session);
    } catch (error) {
      console.warn('Could not refresh the user; keeping the current session', error);
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
        error: getErrorMessage(error, 'Login failed') 
      };
    }
  },

  loginParentCognito: async (email, password) => {
    try {
      const response = await client.post('/api/auth/cognito/login', { email, password });
      if (response.data.success) {
        // The Cognito login set the session cookie; read the user it belongs to without the app loader
        await useAuthStore.getState().refreshUser();
        if (!useAuthStore.getState().isAuthenticated) {
          return { success: false, error: 'Signed in, but your account could not be loaded. Please try again.' };
        }
        return {
          success: true,
          role: response.data.role
        };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { 
        success: false, 
        error: getErrorMessage(error, 'Login failed') 
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
      await endServerSession();
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

// The chat socket is bound to the session it handshook with. However that changes (logout, a 401, a
// failed auth check, a login), the old socket must go: after a login the next one is opened with the
// new cookies, and a socket the server refused while the visitor was anonymous is never reused.
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated !== state.isAuthenticated) resetSocket();
});

export default useAuthStore;
