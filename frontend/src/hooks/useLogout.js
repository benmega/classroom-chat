import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

// True while the user's own sign-out runs. The moment the session clears, ProtectedRoute bounces the
// page they were on to /login. That bounce must not remember the page as somewhere to come back to:
// they left on purpose, and whoever signs in next on this browser is not necessarily them.
let signingOut = false;
export const isSigningOut = () => signingOut;

// Signs the user out and returns them to the landing page. logout() clears the local session even
// when the request fails, so the navigation always happens. Shared so every layout exits the same way.
const useLogout = () => {
    const navigate = useNavigate();

    return useCallback(async () => {
        signingOut = true;
        try {
            await useAuthStore.getState().logout();
            navigate('/');
        } finally {
            signingOut = false;
        }
    }, [navigate]);
};

export default useLogout;
