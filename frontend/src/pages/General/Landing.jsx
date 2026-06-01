import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useViewport from '../../hooks/useViewport';
import LandingDesktop from './LandingDesktop';
import LandingMobile from './LandingMobile';

const Landing = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { isMobile } = useViewport();

    // If authenticated, automatically go to chat
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/chat');
        }
    }, [isAuthenticated, navigate]);

    if (isMobile) {
        return <LandingMobile />;
    }
    return <LandingDesktop />;
};

export default Landing;
