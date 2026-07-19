import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditProfile from './EditProfile';
import useAuthStore from '../../store/useAuthStore';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: vi.fn(),
    },
    writable: true
});

window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

describe('EditProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        useAuthStore.setState({
            user: {
                username: 'testuser',
                nickname: 'Test Nick',
                bio: 'This is my bio',
                role: 'student',
                profile_picture: 'pic.jpg',
                drawer: 'Drawer A1'
            },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false
        });
    });

    it('renders user details correctly', async () => {
        server.use(
            http.get('*/user/api/parent-code', () => {
                return HttpResponse.json({ data: { connection_code: 'ABCD-1234' } });
            })
        );

        render(<EditProfile />);

        expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Nick')).toBeInTheDocument();
        expect(screen.getByDisplayValue('This is my bio')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Drawer A1')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByDisplayValue('ABCD-1234')).toBeInTheDocument();
        });
    });

    it('handles connection code copy', async () => {
        server.use(
            http.get('*/user/api/parent-code', () => {
                return HttpResponse.json({ data: { connection_code: 'ABCD-1234' } });
            })
        );

        render(<EditProfile />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('ABCD-1234')).toBeInTheDocument();
        });

        const copyBtn = screen.getByTitle('Copy Code');
        fireEvent.click(copyBtn);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD-1234');
        expect(toast.success).toHaveBeenCalledWith('Code copied to clipboard!');
    });

    it('updates inputs and shows save/cancel buttons when changed', () => {
        render(<EditProfile />);
        
        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();

        const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
        fireEvent.change(nicknameInput, { target: { value: 'New Nick' } });

        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('cancels changes', () => {
        render(<EditProfile />);
        
        const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
        fireEvent.change(nicknameInput, { target: { value: 'New Nick' } });

        const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        expect(nicknameInput.value).toBe('Test Nick');
    });

    it('toggles password visibility', () => {
        const { container } = render(<EditProfile />);

        const passInput = screen.getByPlaceholderText('Leave blank to keep current');
        const confirmInput = screen.getByPlaceholderText('Confirm your new password');

        expect(passInput).toHaveAttribute('type', 'password');
        expect(confirmInput).toHaveAttribute('type', 'password');

        const toggleBtns = container.querySelectorAll('.password-toggle-btn');
        
        fireEvent.click(toggleBtns[0]);
        expect(passInput).toHaveAttribute('type', 'text');

        fireEvent.click(toggleBtns[1]);
        expect(confirmInput).toHaveAttribute('type', 'text');
    });

    it('validates password match', () => {
        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText('Leave blank to keep current'), { target: { value: 'pass123' } });
        fireEvent.change(screen.getByPlaceholderText('Confirm your new password'), { target: { value: 'pass456' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        expect(toast.error).toHaveBeenCalledWith('Passwords do not match!');
    });

    it('handles successful profile update', async () => {
        server.use(
            http.post('*/user/edit_profile', async ({ request }) => {
                const body = await request.json();
                expect(body.nickname).toBe('New Nick');
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText('Enter your nickname'), { target: { value: 'New Nick' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
        });
        
        // Buttons should disappear since checkAuth resets changes by setting inputs to new store state
    });

    it('handles file change', async () => {
        render(<EditProfile />);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        const fileInput = screen.getByLabelText('Change Photo');
        
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    it('handles successful profile picture update and info update together', async () => {
        server.use(
            http.post('*/user/api/profile-picture', async () => {
                return HttpResponse.json({ success: true });
            }),
            http.post('*/user/edit_profile', async () => {
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
        const fileInput = screen.getByLabelText('Change Photo');
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
        });
    });

    it('handles update failure', async () => {
        server.use(
            http.post('*/user/edit_profile', () => {
                return HttpResponse.json({ error: 'Failed to save' }, { status: 400 });
            })
        );

        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText('Enter your nickname'), { target: { value: 'New Nick' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to save');
        });
    });
});
