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

    // If authenticated, automatically go to the appropriate dashboard/home
    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'parent') {
                navigate('/parent/dashboard');
            } else if (user.is_admin) {
                navigate('/admin/dashboard');
            } else {
                navigate('/chat');
            }
        }
    }, [isAuthenticated, user, navigate]);

    if (isMobile) {
        return <LandingMobile />;
    }
    return <LandingDesktop />;
};

export default Landing;
