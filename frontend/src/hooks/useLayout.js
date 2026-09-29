import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import client from '../api/client';
import useSidebar from './useSidebar';

export const useLayout = () => {
    const { user, logout, isAuthenticated } = useAuthStore();
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

    const duckBalance = user?.duck_balance;

    useEffect(() => {
        if (duckBalance === undefined) {
            prevDuckBalanceRef.current = duckBalance;
            return;
        }

        let quackInterval = null;

        if (prevDuckBalanceRef.current !== undefined && prevDuckBalanceRef.current !== null) {
            const currentDucks = Math.floor(duckBalance || 0);
            const prevDucks = Math.floor(prevDuckBalanceRef.current || 0);
            const diff = currentDucks - prevDucks;

            if (diff > 0) {
                const quackCount = Math.min(diff, 100);
                let quacksPlayed = 0;
                
                quackInterval = setInterval(() => {
                    if (quacksPlayed >= quackCount) {
                        clearInterval(quackInterval);
                        return;
                    }
                    const audio = new Audio('/static/sounds/quack.mp3');
                    audio.play().catch(err => console.warn('Quack autoplay prevented:', err));
                    quacksPlayed++;
                }, 60); 
            }
        }
        
        prevDuckBalanceRef.current = duckBalance;

        return () => {
            if (quackInterval) clearInterval(quackInterval);
        };
    }, [duckBalance]);

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
        location
    };
};
