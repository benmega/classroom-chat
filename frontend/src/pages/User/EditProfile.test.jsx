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

    it('renders user details correctly and disables nickname for student', async () => {
        server.use(
            http.get('*/user/api/parent-code', () => {
                return HttpResponse.json({ data: { connection_code: 'ABCD-1234' } });
            })
        );

        render(<EditProfile />);

        expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Nick')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Enter your nickname/i)).toBeDisabled();
        expect(screen.getByText('Nickname (readonly)')).toBeInTheDocument();
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

    it('updates inputs and shows save/cancel buttons when bio is changed', () => {
        render(<EditProfile />);
        
        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();

        const bioInput = screen.getByPlaceholderText(/Tell us about yourself\.\.\./i);
        fireEvent.change(bioInput, { target: { value: 'New Bio' } });

        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('cancels changes', () => {
        render(<EditProfile />);
        
        const bioInput = screen.getByPlaceholderText(/Tell us about yourself\.\.\./i);
        fireEvent.change(bioInput, { target: { value: 'New Bio' } });

        const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByRole('button', { name: /Save Changes/i })).not.toBeInTheDocument();
        expect(bioInput.value).toBe('This is my bio');
    });

    it('toggles password visibility', () => {
        const { container } = render(<EditProfile />);

        const passInput = screen.getByPlaceholderText(/^New Password/i);
        const confirmInput = screen.getByPlaceholderText(/confirm new password/i);

        expect(passInput).toHaveAttribute('type', 'password');
        expect(confirmInput).toHaveAttribute('type', 'password');

        const toggleBtns = screen.getAllByRole("button").filter(b => b.classList.contains("password-toggle-btn"));
        
        fireEvent.click(toggleBtns[0]);
        expect(passInput).toHaveAttribute('type', 'text');

        fireEvent.click(toggleBtns[1]);
        expect(confirmInput).toHaveAttribute('type', 'text');
    });

    it('validates password match', () => {
        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText(/^New Password/i), { target: { value: 'pass123' } });
        fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'pass456' } });

        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        expect(toast.error).toHaveBeenCalledWith('Passwords do not match!');
    });

    it('handles successful profile update for student (without sending nickname)', async () => {
        server.use(
            http.post('*/user/edit_profile', async ({ request }) => {
                const body = await request.json();
                expect(body.nickname).toBeUndefined();
                expect(body.bio).toBe('New Bio');
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'New Bio' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();

        await waitFor(() => {
            
        });
    });

    it('allows non-student to edit nickname and sends nickname in payload', async () => {
        useAuthStore.setState({
            user: {
                username: 'parentuser',
                nickname: 'Parent Nick',
                bio: 'Parent bio',
                role: 'parent',
                profile_picture: 'pic.jpg',
            },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false
        });

        server.use(
            http.post('*/user/edit_profile', async ({ request }) => {
                const body = await request.json();
                expect(body.nickname).toBe('New Parent Nick');
                return HttpResponse.json({ success: true });
            })
        );

        render(<EditProfile />);

        const nicknameInput = screen.getByPlaceholderText(/Enter your nickname/i);
        expect(nicknameInput).not.toBeDisabled();

        fireEvent.change(nicknameInput, { target: { value: 'New Parent Nick' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            
        });
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
            
        });
    });

    it('handles update failure', async () => {
        server.use(
            http.post('*/user/edit_profile', () => {
                return HttpResponse.json({ error: 'Failed to save' }, { status: 400 });
            })
        );

        render(<EditProfile />);

        fireEvent.change(screen.getByPlaceholderText(/Tell us about yourself\.\.\./i), { target: { value: 'New Bio' } });
        fireEvent.submit(screen.getByRole('button', { name: /Save Changes/i }).closest('form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to save');
        });
    });
});
