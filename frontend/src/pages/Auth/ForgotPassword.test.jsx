import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForgotPassword from './ForgotPassword';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

const ResetPasswordPage = () => <div data-testid="reset-page">Reset Password</div>;

describe('ForgotPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and defaults to student role', () => {
        render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <ForgotPassword />
            </MemoryRouter>
        );

        expect(screen.getByText('Forgot Password')).toBeInTheDocument();
        expect(screen.getByText(/Select your role to reset your password/i)).toBeInTheDocument();
        expect(screen.getByText('Please ask your teacher to reset your password.')).toBeInTheDocument();
        
        // Ensure email input is not visible for student
        expect(screen.queryByPlaceholderText('Enter your Email Address')).not.toBeInTheDocument();
    });

    it('switches to parent role and renders form', () => {
        render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <ForgotPassword />
            </MemoryRouter>
        );

        const parentBtn = screen.getByRole('button', { name: 'Parent' });
        fireEvent.click(parentBtn);

        expect(screen.getByPlaceholderText('Enter your Email Address')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Send Code/i })).toBeInTheDocument();
    });

    it('shows error toast if email is empty when form submitted', async () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <ForgotPassword />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Parent' }));
        
        const form = container.querySelector('#forgot-password-form');
        fireEvent.submit(form);

        expect(toast.error).toHaveBeenCalledWith('Please enter your email address.');
    });

    it('submits form, shows success toast and navigates to reset password', async () => {
        server.use(
            http.post('*/api/auth/cognito/forgot-password', async ({ request }) => {
                const body = await request.json();
                expect(body.email).toBe('test@example.com');
                return HttpResponse.json({ success: true });
            })
        );

        render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <Routes>
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Parent' }));
        
        const emailInput = screen.getByPlaceholderText('Enter your Email Address');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        const submitBtn = screen.getByRole('button', { name: /Send Code/i });
        fireEvent.click(submitBtn);

        expect(screen.getByRole('button', { name: /Sending.../i })).toBeInTheDocument();

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Verification code sent to your email!');
        });
        
        expect(screen.getByTestId('reset-page')).toBeInTheDocument();
    });

    it('shows error toast if submission fails', async () => {
        server.use(
            http.post('*/api/auth/cognito/forgot-password', () => {
                return HttpResponse.json({ error: 'Email not found' }, { status: 400 });
            })
        );

        render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <ForgotPassword />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Parent' }));
        
        const emailInput = screen.getByPlaceholderText('Enter your Email Address');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        const submitBtn = screen.getByRole('button', { name: /Send Code/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Email not found');
        });
    });

    it('shows default error toast if network fails', async () => {
        server.use(
            http.post('*/api/auth/cognito/forgot-password', () => {
                return HttpResponse.error();
            })
        );

        render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <ForgotPassword />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Parent' }));
        
        const emailInput = screen.getByPlaceholderText('Enter your Email Address');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        const submitBtn = screen.getByRole('button', { name: /Send Code/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to send verification code.');
        });
    });
});
