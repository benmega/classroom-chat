import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import client from '../api/client';
import useSidebar from './useSidebar';

export const useLayout = () => {
    const { user, logout, isAuthenticated, hamburgerProgress } = useAuthStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useSidebar();

    const toggleDropdown = (e) => {
        if (e) e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
    };

    // --- Duck Balance Tracking for Quack Sound ---
    const prevDuckBalanceRef = useRef(user?.duck_balance);

    useEffect(() => {
        if (!user || user.duck_balance === undefined) {
            prevDuckBalanceRef.current = user?.duck_balance;
            return;
        }

        if (prevDuckBalanceRef.current !== undefined && prevDuckBalanceRef.current !== null) {
            const currentDucks = Math.floor(user.duck_balance || 0);
            const prevDucks = Math.floor(prevDuckBalanceRef.current || 0);
            const diff = currentDucks - prevDucks;

            if (diff > 0) {
                const quackCount = Math.min(diff, 10); // cap to 10 to avoid noise spam
                let quacksPlayed = 0;
                
                const playQuack = () => {
                    const audio = new Audio('/static/sounds/quack.mp3');
                    audio.volume = 1.0;
                    audio.play().catch(err => console.warn('Quack autoplay prevented:', err));
                };

                // Play first quack immediately
                playQuack();
                quacksPlayed++;

                if (quacksPlayed < quackCount) {
                    const quackInterval = setInterval(() => {
                        if (quacksPlayed >= quackCount) {
                            clearInterval(quackInterval);
                            return;
                        }
                        playQuack();
                        quacksPlayed++;
                    }, 250); 
                }
            }
        }
        
        prevDuckBalanceRef.current = user.duck_balance;
    }, [user?.duck_balance, user]);

    // --- Heartbeat ---
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const HEARTBEAT_INTERVAL = 30000; // 30 seconds
        
        const sendHeartbeat = async () => {
            try {
                await client.post('/api/session/heartbeat');
            } catch (err) {
                console.error('Heartbeat failed:', err);
            }
        };

        sendHeartbeat();

        const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, [isAuthenticated, user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isGuestPage = ['/login', '/signup'].includes(location.pathname);
    const isChatPage = location.pathname === '/' || location.pathname.startsWith('/chat');

    return {
        user,
        isAuthenticated,
        isDropdownOpen,
        setIsDropdownOpen,
        dropdownRef,
        isSidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        toggleDropdown,
        handleLogout,
        isGuestPage,
        isChatPage,
        location,
        hamburgerProgress
    };
};
