import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import AdminPageHeader from './AdminPageHeader';
import { SidebarProvider } from '../../context/SidebarContext';
import useSidebar from '../../hooks/useSidebar';

const SidebarState = () => <output data-testid="sidebar-state">{String(useSidebar().isSidebarOpen)}</output>;

const renderHeader = (props = {}, children) => render(
    <SidebarProvider>
        <AdminPageHeader title="User Directory" {...props}>{children}</AdminPageHeader>
        <SidebarState />
    </SidebarProvider>
);

describe('AdminPageHeader', () => {
    it('shows the title as the page heading', () => {
        renderHeader();

        expect(screen.getByRole('heading', { level: 1, name: 'User Directory' })).toBeInTheDocument();
    });

    it('renders header actions only when it is given some', () => {
        const { container, rerender } = renderHeader();
        expect(container.querySelector('.header-actions')).toBeNull();

        rerender(
            <SidebarProvider>
                <AdminPageHeader title="User Directory"><button>Add User</button></AdminPageHeader>
            </SidebarProvider>
        );

        expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
    });

    it('has a menu button that is named, is not a submit button and starts collapsed', () => {
        renderHeader();

        const menu = screen.getByRole('button', { name: 'Open menu' });
        expect(menu).toHaveAttribute('type', 'button');
        expect(menu).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles the sidebar from the keyboard and reports it with aria-expanded', async () => {
        const user = userEvent.setup();
        renderHeader();
        const menu = screen.getByRole('button', { name: 'Open menu' });

        menu.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByTestId('sidebar-state')).toHaveTextContent('true');
        expect(menu).toHaveAttribute('aria-expanded', 'true');

        await user.keyboard(' ');

        expect(screen.getByTestId('sidebar-state')).toHaveTextContent('false');
        expect(menu).toHaveAttribute('aria-expanded', 'false');
    });
});
