import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPassword from './ResetPassword';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

const LoginPage = () => <div data-testid="login-page">Login Page</div>;

describe('ResetPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with email in title if provided via search params', () => {
        render(
            <MemoryRouter initialEntries={['/reset-password?email=test@example.com']}>
                <ResetPassword />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
        expect(screen.getByText('Enter the code sent to test@example.com')).toBeInTheDocument();
    });

    it('renders without email in title if missing', () => {
        render(
            <MemoryRouter initialEntries={['/reset-password']}>
                <ResetPassword />
            </MemoryRouter>
        );

        expect(screen.getByText('Enter your verification code')).toBeInTheDocument();
    });

    it('toggles password visibility', () => {
        render(
            <MemoryRouter initialEntries={['/reset-password?email=test@example.com']}>
                <ResetPassword />
            </MemoryRouter>
        );

        const passwordInput = screen.getByPlaceholderText(/^new password/i);
        const confirmInput = screen.getByPlaceholderText(/confirm new password/i);

        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(confirmInput).toHaveAttribute('type', 'password');

        const toggleBtns = screen.getAllByRole('button', { name: 'Show password' });
        
        fireEvent.click(toggleBtns[0]);
        expect(passwordInput).toHaveAttribute('type', 'text');
        
        fireEvent.click(toggleBtns[1]);
        expect(confirmInput).toHaveAttribute('type', 'text');
    });

    it('shows error toast if email is missing when submitting', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/reset-password']}>
                <ResetPassword />
            </MemoryRouter>
        );

        const form = screen.getByPlaceholderText(/verification code/i).closest("form");
        fireEvent.submit(form);

        expect(toast.error).toHaveBeenCalledWith('Email is missing. Please restart the password reset process.');
    });

    it('shows error toast if passwords do not match', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/reset-password?email=test@example.com']}>
                <ResetPassword />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/verification code/i), { target: { value: '123456' } });
        fireEvent.change(screen.getByPlaceholderText(/^new password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'password456' } });

        const form = screen.getByPlaceholderText(/verification code/i).closest("form");
        fireEvent.submit(form);

        expect(toast.error).toHaveBeenCalledWith('Passwords do not match.');
    });

    it('submits successfully and navigates to login', async () => {
        server.use(
            http.post('*/api/auth/cognito/confirm-forgot-password', async ({ request }) => {
                const body = await request.json();
                expect(body.email).toBe('test@example.com');
                expect(body.code).toBe('123456');
                expect(body.new_password).toBe('password123');
                return HttpResponse.json({ success: true });
            })
        );

        const { container } = render(
            <MemoryRouter initialEntries={['/reset-password?email=test@example.com']}>
                <Routes>
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/login" element={<LoginPage />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/verification code/i), { target: { value: '123456' } });
        fireEvent.change(screen.getByPlaceholderText(/^new password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'password123' } });

        const form = screen.getByPlaceholderText(/verification code/i).closest("form");
        fireEvent.submit(form);

        expect(screen.getByRole('button', { name: /Resetting.../i })).toBeInTheDocument();

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Password reset successfully! Please log in.');
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    it('shows error toast on submission failure', async () => {
        server.use(
            http.post('*/api/auth/cognito/confirm-forgot-password', () => {
                return HttpResponse.json({ error: 'Invalid verification code' }, { status: 400 });
            })
        );

        const { container } = render(
            <MemoryRouter initialEntries={['/reset-password?email=test@example.com']}>
                <ResetPassword />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/verification code/i), { target: { value: 'wrong_code' } });
        fireEvent.change(screen.getByPlaceholderText(/^new password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'password123' } });

        const form = screen.getByPlaceholderText(/verification code/i).closest("form");
        fireEvent.submit(form);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Invalid verification code');
        });
    });

    it('shows generic error toast on network failure', async () => {
        server.use(
            http.post('*/api/auth/cognito/confirm-forgot-password', () => {
                return HttpResponse.error();
            })
        );

        const { container } = render(
            <MemoryRouter initialEntries={['/reset-password?email=test@example.com']}>
                <ResetPassword />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/verification code/i), { target: { value: '123456' } });
        fireEvent.change(screen.getByPlaceholderText(/^new password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), { target: { value: 'password123' } });

        const form = screen.getByPlaceholderText(/verification code/i).closest("form");
        fireEvent.submit(form);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to reset password.');
        });
    });
});
