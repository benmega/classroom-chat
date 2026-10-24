import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import DesktopNavRail from './DesktopNavRail';

vi.mock('../../store/useAuthStore', () => ({
    default: () => ({ unreadCount: 0 }),
}));

const renderRail = (user, pathname = '/chat') =>
    render(
        <MemoryRouter>
            <DesktopNavRail user={user} location={{ pathname }} handleLogout={vi.fn()} />
        </MemoryRouter>
    );

const testsLink = () => document.querySelector('a[data-tooltip="Tests"]');

describe('DesktopNavRail Tests entry', () => {
    it('links students to /tests', () => {
        renderRail({ role: 'student', username: 's1' });

        expect(testsLink()).toHaveAttribute('href', '/tests');
        expect(testsLink()).not.toHaveClass('active');
    });

    it('shows it to admins too', () => {
        renderRail({ role: 'admin', username: 'a1' });

        expect(testsLink()).toBeInTheDocument();
    });

    it('is active on the test list, a test and a result', () => {
        for (const path of ['/tests', '/tests/grades-3-5', '/tests/results/4']) {
            const { unmount } = renderRail({ role: 'student' }, path);
            expect(testsLink()).toHaveClass('active');
            unmount();
        }
    });

    it('is not active elsewhere', () => {
        renderRail({ role: 'student' }, '/profile');

        expect(testsLink()).not.toHaveClass('active');
    });
});
