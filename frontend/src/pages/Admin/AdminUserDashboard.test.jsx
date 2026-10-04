import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminUserDashboard from './AdminUserDashboard';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('../../hooks/useSidebar', () => ({
    default: () => ({
        isOpen: true,
        toggleSidebar: vi.fn(),
    })
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({ userId: '1' })
    };
});

describe('AdminUserDashboard Component Redesign', () => {
    const mockStudent = {
        id: 1,
        username: 'johndoe',
        nickname: 'John D',
        email: 'john@example.com',
        role: 'student',
        active_track: 'cs',
        can_chat: true,
        is_approved: true,
        duck_balance: 150,
        packets: 5,
        drawer: '0xA6',
        is_online: true,
        current_activity: 'CS 1 - Intro'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/user/1') && !url.includes('connection_card')) {
                return Promise.resolve({ data: { user: mockStudent } });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [] } });
            }
            if (url.includes('/api/project-templates')) {
                return Promise.resolve({ data: { data: { templates: { 'Game Template': { description: 'Fun game' } } } } });
            }
            if (url.includes('connection_card')) {
                return Promise.resolve({ data: { status: 'success', data: { connection_code: 'CODE999' } } });
            }
            if (url.includes('/api/admin/students/1/parents')) {
                return Promise.resolve({ data: { success: true, parents: [] } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it('renders hero status bar and prominent track selector', async () => {
        render(
            <BrowserRouter>
                <AdminUserDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('John D')).toBeInTheDocument();
            expect(screen.getByText('@johndoe')).toBeInTheDocument();
        });

        expect(screen.getByText('Online Now')).toBeInTheDocument();
        expect(screen.getByText('CS 1 - Intro')).toBeInTheDocument();

        expect(screen.getByText('Chat Enabled')).toBeInTheDocument();

        expect(screen.getByText('Computer Science')).toBeInTheDocument();
        expect(screen.getByText('Ozaria')).toBeInTheDocument();
        expect(screen.getByText('Game Development')).toBeInTheDocument();
        expect(screen.getByText('Web Development')).toBeInTheDocument();

        expect(screen.getByText('🦆 Ducks')).toBeInTheDocument();
        expect(screen.getByText('📦 Packets')).toBeInTheDocument();
        expect(screen.getByText('🔒 Locker Drawer')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();

        expect(screen.getByText('5.0000')).toBeInTheDocument();
    });


    it('handles quick duck preset click', async () => {
        render(
            <BrowserRouter>
                <AdminUserDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('+1')).toBeInTheDocument();
        });

        const preset1Btn = screen.getByText('+1');
        fireEvent.click(preset1Btn);

        const duckInputs = screen.getAllByPlaceholderText(/Amount \(\+\/-\)/i);
        expect(duckInputs[0].value).toBe('1');
    });

    it('highlights the 3D Modeling track and recent 3D activity for a 3D student', async () => {
        const threeDStudent = {
            ...mockStudent,
            active_track: '3d',
            most_recently_completed_challenge_course: '3d-1',
        };
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/user/1') && !url.includes('connection_card')) {
                return Promise.resolve({ data: { user: threeDStudent } });
            }
            return Promise.resolve({ data: {} });
        });

        render(
            <BrowserRouter>
                <AdminUserDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('3D Modeling', { selector: '.track-card-name' })).toBeInTheDocument();
        });

        const card = screen.getByText('3D Modeling', { selector: '.track-card-name' }).closest('.track-card-btn');
        await waitFor(() => expect(card).toHaveClass('active'));
        expect(screen.getByText('Computer Science').closest('.track-card-btn')).not.toHaveClass('active');

        // Recent activity badge resolves the 3D track (not hidden because of an unknown prefix)
        expect(screen.getByText('TinkerCAD 1', { selector: '.course-badge' })).toBeInTheDocument();
    });

    describe('administrator accounts', () => {
        // The API identifies administrators through `role`; it never sends an is_admin field.
        const renderUser = async (user) => {
            client.get.mockImplementation((url) => {
                if (url.includes('/api/admin/user/1') && !url.includes('connection_card')) {
                    return Promise.resolve({ data: { user } });
                }
                if (url.includes('/api/admin/users')) {
                    return Promise.resolve({ data: { users: [] } });
                }
                if (url.includes('/api/admin/students/1/parents')) {
                    return Promise.resolve({ data: { success: true, parents: [] } });
                }
                return Promise.resolve({ data: {} });
            });
            render(
                <BrowserRouter>
                    <AdminUserDashboard />
                </BrowserRouter>
            );
            await waitFor(() => expect(screen.getByText(`@${user.username}`)).toBeInTheDocument());
            // The edit form is filled from the user in an effect; wait for it before interacting.
            fireEvent.click(screen.getByText('Account & Connections'));
            await waitFor(() => expect(screen.getByLabelText('Username')).toHaveValue(user.username));
        };

        const openSensitiveActions = () => fireEvent.click(screen.getByText('Sensitive Actions'));

        it('offers Delete Account for a student', async () => {
            await renderUser(mockStudent);
            openSensitiveActions();

            expect(screen.getByText('Danger Zone')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Delete Account/ })).toBeInTheDocument();
            expect(screen.getByLabelText('System Administrator')).not.toBeChecked();
        });

        it('hides Delete Account for an administrator and shows the box checked', async () => {
            await renderUser({ ...mockStudent, id: 1, username: 'boss', nickname: 'Boss', role: 'admin' });
            openSensitiveActions();

            expect(screen.queryByText('Danger Zone')).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /Delete Account/ })).not.toBeInTheDocument();
            expect(screen.getByLabelText('System Administrator')).toBeChecked();
        });

        it('does not show the pending-approval banner for an unapproved administrator', async () => {
            await renderUser({ ...mockStudent, username: 'boss', role: 'admin', is_approved: false });

            expect(screen.queryByText('Account Pending Approval')).not.toBeInTheDocument();
        });

        it('still shows the pending-approval banner for an unapproved student', async () => {
            await renderUser({ ...mockStudent, is_approved: false });

            expect(screen.getByText('Account Pending Approval')).toBeInTheDocument();
        });

        it('keeps an administrator an administrator when the profile is saved', async () => {
            const admin = { ...mockStudent, username: 'boss', nickname: 'Boss', role: 'admin' };
            client.put.mockResolvedValue({ data: { status: 'success', data: { message: 'Updated profile for @boss', user: admin } } });
            await renderUser(admin);

            fireEvent.click(screen.getByRole('button', { name: /Save Profile/ }));

            await waitFor(() => expect(client.put).toHaveBeenCalledTimes(1));
            const [url, body] = client.put.mock.calls[0];
            expect(url).toBe('/api/admin/user/1');
            expect(body).toEqual(expect.objectContaining({ username: 'boss', role: 'admin', is_admin: true }));
        });

        it('saves a student without the administrator flag', async () => {
            client.put.mockResolvedValue({ data: { status: 'success', data: { message: 'Updated profile for @johndoe', user: mockStudent } } });
            await renderUser(mockStudent);

            fireEvent.click(screen.getByRole('button', { name: /Save Profile/ }));

            await waitFor(() => expect(client.put).toHaveBeenCalledTimes(1));
            expect(client.put.mock.calls[0][1]).toEqual(expect.objectContaining({ role: 'student', is_admin: false }));
        });
    });

    describe('accessible names for icon buttons and bare inputs', () => {
        const renderDashboard = async () => {
            render(
                <BrowserRouter>
                    <AdminUserDashboard />
                </BrowserRouter>
            );
            // The hero bar is the first thing that renders once the user has loaded
            await screen.findByRole('button', { name: 'Back to users' });
        };

        it('names the icon-only back button and public-profile link in the hero bar', async () => {
            await renderDashboard();

            expect(screen.getByRole('button', { name: 'Back to users' })).toHaveAttribute('type', 'button');
            expect(screen.getByRole('link', { name: 'View public profile (opens in a new tab)' })).toBeInTheDocument();
        });

        it('names the amount and drawer inputs of the economy panel', async () => {
            await renderDashboard();

            expect(screen.getByRole('spinbutton', { name: 'Duck adjustment amount' })).toBeInTheDocument();
            expect(screen.getByRole('spinbutton', { name: 'Packet adjustment amount' })).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: 'Locker drawer' })).toHaveValue('0xA6');
        });

        it('names the link search and the print button of the connections panel', async () => {
            await renderDashboard();
            fireEvent.click(screen.getByText('Account & Connections'));

            expect(screen.getByRole('textbox', { name: 'Search parents to link' })).toBeInTheDocument();
            expect(await screen.findByRole('button', { name: 'Print connection card' })).toHaveAttribute('type', 'button');
        });

        it('says which kind of account the link search finds when the user is a parent', async () => {
            const parent = { ...mockStudent, role: 'parent' };
            client.get.mockImplementation((url) => {
                if (url.includes('/api/admin/user/1')) return Promise.resolve({ data: { user: parent } });
                if (url.includes('/api/admin/users')) return Promise.resolve({ data: { users: [] } });
                return Promise.resolve({ data: { success: true, children: [] } });
            });
            await renderDashboard();
            fireEvent.click(screen.getByText('Account & Connections'));

            expect(screen.getByRole('textbox', { name: 'Search students to link' })).toBeInTheDocument();
        });

        it('names both reset-password fields and their show/hide toggles, and reports the toggle state', async () => {
            await renderDashboard();
            fireEvent.click(screen.getByText('Sensitive Actions'));

            const newPassword = screen.getByLabelText('New password');
            const confirmPassword = screen.getByLabelText('Confirm password');
            expect(newPassword).toHaveAttribute('type', 'password');

            const showNew = screen.getByRole('button', { name: 'Show new password' });
            expect(showNew).toHaveAttribute('aria-pressed', 'false');
            fireEvent.click(showNew);
            expect(newPassword).toHaveAttribute('type', 'text');
            expect(showNew).toHaveAttribute('aria-pressed', 'true');

            fireEvent.click(screen.getByRole('button', { name: 'Show confirm password' }));
            expect(confirmPassword).toHaveAttribute('type', 'text');
        });

        it.each([
            ['Assign Project', 'Project template'],
            ['Award Certificate', 'Certificate course'],
            ['Pass Chapter', 'Chapter'],
        ])('names the select in the %s dialog', async (action, selectName) => {
            await renderDashboard();

            fireEvent.click(screen.getByRole('button', { name: action }));

            const dialog = await screen.findByRole('dialog');
            expect(within(dialog).getByRole('combobox', { name: selectName })).toBeInTheDocument();
        });
    });
});
