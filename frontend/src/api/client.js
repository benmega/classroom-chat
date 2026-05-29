import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
  },
  xsrfCookieName: 'csrf_token_v2',
  xsrfHeaderName: 'X-CSRFToken',
});

// Global response interceptor for handling common errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401 Unauthorized, the session has expired or user is not logged in
    if (error.response && error.response.status === 401) {
      // Avoid redirect loops if we are already on the login page
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/api/dev-login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
