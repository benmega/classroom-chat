import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AdminPageHeader from './AdminPageHeader';

const renderHeader = (props = {}, children) => render(
    <AdminPageHeader title="User Directory" {...props}>{children}</AdminPageHeader>
);

describe('AdminPageHeader', () => {
    it('shows the title as the page heading', () => {
        renderHeader();

        expect(screen.getByRole('heading', { level: 1, name: 'User Directory' })).toBeInTheDocument();
    });

    it('renders header actions only when it is given some', () => {
        const { container, rerender } = renderHeader();
        expect(container.querySelector('.header-actions')).toBeNull();

        rerender(<AdminPageHeader title="User Directory"><button>Add User</button></AdminPageHeader>);

        expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
    });

    it('has no menu button of its own, so the layout menu button is the only one on a page', () => {
        const { container } = renderHeader();

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(container.querySelector('.hamburger-toggle')).toBeNull();
    });
});
