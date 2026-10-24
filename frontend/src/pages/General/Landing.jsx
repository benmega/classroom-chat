import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useViewport from '../../hooks/useViewport';
import LandingDesktop from './LandingDesktop';
import LandingMobile from './LandingMobile';

const Landing = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();
    const { isMobile } = useViewport();

    useEffect(() => {
        // replace: Back must not return to this page just to be sent on again
        if (isAuthenticated && user) {
            if (user.role === 'parent') {
                navigate('/parent/dashboard', { replace: true });
            } else if (user.role === 'admin') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/chat', { replace: true });
            }
        }
    }, [isAuthenticated, user, navigate]);

    if (isMobile) {
        return <LandingMobile />;
    }
    return <LandingDesktop />;
};

export default Landing;
