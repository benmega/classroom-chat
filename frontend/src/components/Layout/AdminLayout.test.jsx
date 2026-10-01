import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLayout from './AdminLayout';
import useAuthStore from '../../store/useAuthStore';
import { SidebarProvider } from '../../context/SidebarContext';

vi.mock('../../api/client', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: { status: 'error' } }) },
}));

const renderLayout = (children) => render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
        <SidebarProvider>
            <AdminLayout>{children}</AdminLayout>
        </SidebarProvider>
    </MemoryRouter>
);

describe('AdminLayout Component', () => {
    beforeEach(() => {
        useAuthStore.setState({
            isAuthenticated: true,
            user: { role: 'admin', username: 'admin1' },
        });
    });

    it('renders the sidebar and its children for an admin', () => {
        renderLayout(<div>Admin Page Content</div>);

        expect(screen.getByRole('link', { name: 'Admin HQ Home' })).toBeInTheDocument();
        expect(screen.getByText('Admin Page Content')).toBeInTheDocument();
    });

    it('shows Access Denied instead of the children for a non-admin', () => {
        useAuthStore.setState({ user: { role: 'student', username: 'student1' } });

        renderLayout(<div>Admin Page Content</div>);

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Admin Page Content')).not.toBeInTheDocument();
    });

    it('keeps the sidebar mounted and shows an in-content loader while a lazy page loads', async () => {
        let resolveChunk;
        const LazyPage = React.lazy(() => new Promise((resolve) => {
            resolveChunk = () => resolve({ default: () => <div>Lazy Admin Page</div> });
        }));

        renderLayout(<LazyPage />);

        // Sidebar stays on screen; only the <main> content area shows the loader.
        expect(screen.getByRole('link', { name: 'Admin HQ Home' })).toBeInTheDocument();
        const loader = screen.getByRole('status', { name: 'Loading page' });
        expect(screen.getByRole('main')).toContainElement(loader);
        expect(screen.queryByText('Lazy Admin Page')).not.toBeInTheDocument();

        await act(async () => {
            resolveChunk();
        });

        expect(screen.getByText('Lazy Admin Page')).toBeInTheDocument();
        expect(screen.queryByRole('status', { name: 'Loading page' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Admin HQ Home' })).toBeInTheDocument();
    });
});
