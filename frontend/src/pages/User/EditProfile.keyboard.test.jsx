import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditProfile from './EditProfile';
import useAuthStore from '../../store/useAuthStore';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';

// Keyboard and screen reader access of the settings form. These tests drive the page with user-event, which
// installs its own clipboard stub, so they live apart from EditProfile.test.jsx (that file pins navigator.clipboard).

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
window.URL.revokeObjectURL = vi.fn();

const fileInput = () => screen.getByLabelText('Change Photo');

describe('EditProfile keyboard and screen reader access', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        server.use(
            http.get('*/user/api/parent-code', () => HttpResponse.json({ data: { connection_code: 'ABCD-1234' } }))
        );
        useAuthStore.setState({
            user: {
                id: 1,
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

    it('keeps the photo input focusable (visually hidden, not display:none) so Tab reaches it', async () => {
        const user = userEvent.setup();
        render(<EditProfile />);
        const input = fileInput();

        expect(input).toHaveClass('sr-only');
        expect(input).not.toHaveAttribute('hidden');
        await user.tab();

        expect(input).toHaveFocus();
    });

    it('still names the photo input from its visible label', () => {
        render(<EditProfile />);

        expect(fileInput()).toHaveAttribute('id', 'pfp-upload');
        expect(document.querySelector('label.upload-overlay')).toHaveTextContent('Change Photo');
    });

    it('takes a chosen photo from the focusable input', () => {
        render(<EditProfile />);

        fireEvent.change(fileInput(), { target: { files: [new File(['dummy content'], 'me.png', { type: 'image/png' })] } });

        expect(screen.getByAltText('Profile Preview').getAttribute('src')).toMatch(/^blob:/);
    });

    it('names the pairing code field and its copy button', async () => {
        render(<EditProfile />);

        const copy = await screen.findByRole('button', { name: 'Copy pairing code' });
        await waitFor(() => expect(copy).toBeEnabled());
        expect(screen.getByRole('textbox', { name: 'Pairing code' })).toHaveValue('ABCD-1234');
        expect(copy).toHaveAttribute('title', 'Copy Code');
    });

    it('names the pairing code field while it is still loading', () => {
        render(<EditProfile />);

        expect(screen.getByRole('textbox', { name: 'Pairing code' })).toHaveValue('Loading...');
    });

    it('puts the password visibility buttons in the tab order, named and with their state', async () => {
        const user = userEvent.setup();
        render(<EditProfile />);
        const newToggle = screen.getByRole('button', { name: 'Show new password' });
        const confirmToggle = screen.getByRole('button', { name: 'Show confirm new password' });
        expect(newToggle).not.toHaveAttribute('tabindex');
        expect(confirmToggle).not.toHaveAttribute('tabindex');
        expect(newToggle).toHaveAttribute('aria-pressed', 'false');
        expect(confirmToggle).toHaveAttribute('aria-pressed', 'false');

        screen.getByPlaceholderText(/^New Password/i).focus();
        await user.tab();
        expect(newToggle).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(newToggle).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByPlaceholderText(/^New Password/i)).toHaveAttribute('type', 'text');

        await user.tab();
        await user.tab();
        expect(confirmToggle).toHaveFocus();
        await user.keyboard(' ');
        expect(confirmToggle).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByPlaceholderText(/confirm new password/i)).toHaveAttribute('type', 'text');
    });
});
