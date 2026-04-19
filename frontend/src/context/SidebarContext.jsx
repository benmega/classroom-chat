import React, { createContext, useState, useContext } from 'react';

export const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const setSidebarOpen = (isOpen) => setIsSidebarOpen(isOpen);

    return (
        <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar, setSidebarOpen }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
};

export default useSidebar;
