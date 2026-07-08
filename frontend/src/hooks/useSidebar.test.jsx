import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSidebar } from './useSidebar';
import { SidebarProvider } from '../context/SidebarContext';

describe('useSidebar', () => {
    it('throws error when used outside of SidebarProvider', () => {
        // Prevent console.error clutter in test logs from the expected throw
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useSidebar())).toThrow(
            'useSidebar must be used within a SidebarProvider'
        );

        consoleErrorSpy.mockRestore();
    });

    it('returns sidebar context when used within SidebarProvider', () => {
        const wrapper = ({ children }) => (
            <SidebarProvider>{children}</SidebarProvider>
        );

        const { result } = renderHook(() => useSidebar(), { wrapper });

        expect(result.current).toBeDefined();
        expect(typeof result.current.isSidebarOpen).toBe('boolean');
        expect(typeof result.current.toggleSidebar).toBe('function');
    });
});
