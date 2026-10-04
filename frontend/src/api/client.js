import axios from 'axios';
import toast from 'react-hot-toast';
import { getApiBaseUrl } from '../utils/apiUrl';

// A hung server must not leave a spinner up forever. axios' timeout covers the whole request, not
// idle time, so the transfers that can legitimately take longer are raised in the request interceptor.
const DEFAULT_TIMEOUT_MS = 30000;
// Uploads (the backend accepts up to 500 MB) get no client-side limit: any fixed one would cut off a
// slow connection part-way, and the server and proxy already bound them.
const UPLOAD_TIMEOUT_MS = 0;
// Blob downloads (exports, certificates) are generated server side; matches the proxy's 300 s read timeout.
const DOWNLOAD_TIMEOUT_MS = 300000;

// Pages a signed-out user is meant to be on. A 401 there is expected (a failed login, say) and says
// nothing about a session, so it must not touch the auth state.
const GUEST_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/dev-login'];
const isGuestPath = (pathname) => GUEST_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

// Flask-WTF answers a missing, expired or mismatching CSRF token with werkzeug's stock 400 HTML page.
const isCsrfFailure = (error) => {
  if (error.response?.status !== 400) return false;
  const { data } = error.response;
  const text = typeof data === 'string' ? data : data?.error;
  return typeof text === 'string' && /csrf/i.test(text);
};

const client = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: DEFAULT_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  xsrfCookieName: 'csrf_token_v2',
  xsrfHeaderName: 'X-CSRFToken',
});


const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
};

client.interceptors.request.use((config) => {
  const token = getCookie('csrf_token_v2');
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  // Only a timeout left at the default is raised, so a call site's own explicit value always wins
  if (config.timeout === DEFAULT_TIMEOUT_MS) {
    if (config.data instanceof FormData) {
      config.timeout = UPLOAD_TIMEOUT_MS;
    } else if (config.responseType === 'blob') {
      config.timeout = DOWNLOAD_TIMEOUT_MS;
    }
  }
  return config;
});


client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirect loops if we are already on a sign-in page
      if (!isGuestPath(window.location.pathname)) {
        // Use dynamic import to avoid circular dependency
        import('../store/useAuthStore').then(({ default: useAuthStore }) => {
          useAuthStore.getState().clearSession();
        });
      }
    } else if (isCsrfFailure(error)) {
      // The call site would only say "Failed to ...". A stable id keeps a burst of failing calls to one toast.
      toast.error('Your session expired. Please reload the page and try again.', { id: 'csrf-expired', duration: 8000 });
      // The session itself may be gone too: let the auth check send the user to /login if so
      import('../store/useAuthStore').then(({ default: useAuthStore }) => {
        useAuthStore.getState().checkAuth(true);
      });
    }
    return Promise.reject(error);
  }
);

export default client;
