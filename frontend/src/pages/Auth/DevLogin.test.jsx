import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import DevLogin from './DevLogin';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import useAuthStore from '../../store/useAuthStore';

// We need a dummy component to verify navigation
const ChatPage = () => <div data-testid="chat-page">Chat Page</div>;
const CourseProgressPage = () => <div data-testid="course-page">Course Page</div>;

describe('DevLogin', () => {
    beforeEach(() => {
        // Reset auth store before each test
        useAuthStore.setState({ user: null, isAuthenticated: false, isChecking: false });
    });

    it('displays error if API returns failure', async () => {
        server.use(
            http.post('*/api/dev-login', () => {
                return HttpResponse.json({ error: 'Cannot find admin user' }, { status: 400 });
            })
        );

        render(
            <MemoryRouter initialEntries={['/dev-login']}>
                <DevLogin />
            </MemoryRouter>
        );

        expect(screen.getByText('Dev Login')).toBeInTheDocument();
        expect(screen.getByText('Authenticating…')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Cannot find admin user')).toBeInTheDocument();
        });
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    });

    it('displays fallback error message if request fails completely', async () => {
        server.use(
            http.post('*/api/dev-login', () => {
                return HttpResponse.error();
            })
        );

        render(
            <MemoryRouter initialEntries={['/dev-login']}>
                <DevLogin />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Network error|Failed to fetch|Dev login request failed/i)).toBeInTheDocument();
        });
    });

    it('navigates to /chat when logged in as admin', async () => {
        server.use(
            http.post('*/api/dev-login', async ({ request }) => {
                const body = await request.json();
                expect(body.role).toBe('admin');
                return HttpResponse.json({ success: true, user: { username: 'admin' } });
            }),
            http.get('*/user/api/auth/status', () => {
                return HttpResponse.json({ data: { logged_in: true, user: { role: 'admin' } } });
            })
        );

        render(
            <MemoryRouter initialEntries={['/dev-login?role=admin']}>
                <Routes>
                    <Route path="/dev-login" element={<DevLogin />} />
                    <Route path="/chat" element={<ChatPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('chat-page')).toBeInTheDocument();
        });
    });

    it('navigates to /course-progress/:slug when logged in as student with slug', async () => {
        server.use(
            http.post('*/api/dev-login', async ({ request }) => {
                const body = await request.json();
                expect(body.role).toBe('student');
                return HttpResponse.json({ success: true, user: { username: 'student1' } });
            }),
            http.get('*/user/api/auth/status', () => {
                return HttpResponse.json({ data: { logged_in: true, user: { role: 'student', slug: 'student1' } } });
            })
        );

        render(
            <MemoryRouter initialEntries={['/dev-login?role=student']}>
                <Routes>
                    <Route path="/dev-login" element={<DevLogin />} />
                    <Route path="/course-progress/:slug" element={<CourseProgressPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('course-page')).toBeInTheDocument();
        });
    });

    it('navigates to /chat when logged in as student without slug', async () => {
        server.use(
            http.post('*/api/dev-login', async ({ request }) => {
                const body = await request.json();
                expect(body.role).toBe('student');
                return HttpResponse.json({ success: true, user: { username: 'student2' } });
            }),
            http.get('*/user/api/auth/status', () => {
                return HttpResponse.json({ data: { logged_in: true, user: { role: 'student', slug: null } } });
            })
        );

        render(
            <MemoryRouter initialEntries={['/dev-login?role=student']}>
                <Routes>
                    <Route path="/dev-login" element={<DevLogin />} />
                    <Route path="/chat" element={<ChatPage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('chat-page')).toBeInTheDocument();
        });
    });
});
