'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarVisibilityContextType {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    openSidebar: () => void;
}

const SidebarVisibilityContext = createContext<SidebarVisibilityContextType | undefined>(undefined);

export const SidebarVisibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    const openSidebar = useCallback(() => {
        setIsSidebarOpen(true);
    }, []);

    const value = {
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        openSidebar,
    };

    return (
        <SidebarVisibilityContext.Provider value={value}>
            {children}
        </SidebarVisibilityContext.Provider>
    );
};

export const useSidebarVisibility = () => {
    const context = useContext(SidebarVisibilityContext);
    if (context === undefined) {
        throw new Error('useSidebarVisibility must be used within a SidebarVisibilityProvider');
    }
    return context;
};