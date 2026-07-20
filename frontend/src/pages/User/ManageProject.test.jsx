import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ManageProject from './ManageProject';
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

window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

const ProfilePage = () => <div data-testid="profile-page">Profile Page</div>;

describe('ManageProject', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        useAuthStore.setState({
            user: {
                username: 'testuser',
                role: 'student',
            },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false
        });

        server.use(
            http.get('*/api/project-templates', () => {
                return HttpResponse.json({ data: { templates: {} } });
            })
        );
    });

    it('renders create mode and tabs correctly', async () => {
        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <ManageProject />
            </MemoryRouter>
        );

        expect(await screen.findByText('Core Information')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('What is this project about? What did you learn?')).toBeInTheDocument();
        
        // Navigation buttons
        expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('renders edit mode when project is passed in route params', async () => {
        server.use(
            http.get('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'My Cool Game', description: 'A game I built', image_url: 'cover.jpg' } } });
            })
        );

        render(
            <MemoryRouter initialEntries={['/manage-project/1']}>
                <Routes>
                    <Route path="/manage-project/:projectId" element={<ManageProject />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText('Core Information')).toBeInTheDocument();
        expect(screen.getByDisplayValue('My Cool Game')).toBeInTheDocument();
        expect(screen.getByDisplayValue('A game I built')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Delete Project/i })).toBeInTheDocument();
    });

    it('navigates through tabs', async () => {
        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <ManageProject />
            </MemoryRouter>
        );

        // Core tab is active initially
        expect(await screen.findByPlaceholderText('What is this project about? What did you learn?')).toBeInTheDocument();

        // Click next -> Media tab
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        
        expect(await screen.findByText(/Media Assets/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('YouTube/Vimeo URL')).toBeInTheDocument();

        // Click next -> Code tab
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        expect(screen.getByText('Code Showcase')).toBeInTheDocument();
        
        // Save button appears on the last tab
        expect(screen.getByRole('button', { name: /Create Project/i })).toBeInTheDocument();

        // Click back -> Media tab
        fireEvent.click(screen.getByRole('button', { name: /Back/i }));
        expect(screen.getByText(/Media Assets/i)).toBeInTheDocument();
    });

    it('handles image and video file selection', async () => {
        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <ManageProject />
            </MemoryRouter>
        );

        // Wait for load
        await screen.findByText('Core Information');

        // Go to Media tab
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        const imageInput = screen.getByLabelText(/Upload Image/i);
        const imageFile = new File(['img'], 'cover.jpg', { type: 'image/jpeg' });
        fireEvent.change(imageInput, { target: { files: [imageFile] } });

        const videoInput = screen.getByLabelText(/Upload Video/i);
        const videoFile = new File(['vid'], 'demo.mp4', { type: 'video/mp4' });
        fireEvent.change(videoInput, { target: { files: [videoFile] } });
        expect(screen.getByText('Selected: demo.mp4')).toBeInTheDocument();
    });

    it('creates project successfully and navigates to profile', async () => {
        server.use(
            http.post('*/user/project/new', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 2 } } });
            })
        );

        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <Routes>
                    <Route path="/manage-project" element={<ManageProject />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await screen.findByPlaceholderText('What is this project about? What did you learn?');
        fireEvent.change(screen.getByPlaceholderText('What is this project about? What did you learn?'), { target: { value: 'My cool desc' } });
        
        // Go to last tab
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        // Submit form
        const submitBtn = screen.getByRole('button', { name: /Create Project/i });
        fireEvent.click(submitBtn);

        expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Project created!');
            expect(screen.getByTestId('profile-page')).toBeInTheDocument();
        });
    });

    it('updates project successfully', async () => {
        server.use(
            http.get('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'Old Name' } } });
            }),
            http.post('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success' });
            })
        );

        render(
            <MemoryRouter initialEntries={['/manage-project/1']}>
                <Routes>
                    <Route path="/manage-project/:projectId" element={<ManageProject />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await screen.findByText('Core Information');

        // Go to last tab
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        const submitBtn = screen.getByRole('button', { name: /Update Project/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Project updated!');
        });
    });

    it('deletes project after confirmation', async () => {
        window.confirm = vi.fn(() => true);
        server.use(
            http.get('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'To Delete' } } });
            }),
            http.post('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success' });
            })
        );

        render(
            <MemoryRouter initialEntries={['/manage-project/1']}>
                <Routes>
                    <Route path="/manage-project/:projectId" element={<ManageProject />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Routes>
            </MemoryRouter>
        );

        await screen.findByText('Core Information');
        
        fireEvent.click(screen.getByRole('button', { name: /Delete Project/i }));

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this project?');

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Project deleted.');
            expect(screen.getByTestId('profile-page')).toBeInTheDocument();
        });
    });

    it('does not delete if confirmation is cancelled', async () => {
        window.confirm = vi.fn(() => false);
        
        server.use(
            http.get('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'To Keep' } } });
            })
        );

        render(
            <MemoryRouter initialEntries={['/manage-project/1']}>
                <Routes>
                    <Route path="/manage-project/:projectId" element={<ManageProject />} />
                </Routes>
            </MemoryRouter>
        );

        await screen.findByText('Core Information');
        
        fireEvent.click(screen.getByRole('button', { name: /Delete Project/i }));

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this project?');
        expect(screen.queryByTestId('profile-page')).not.toBeInTheDocument();
    });

    it('shows error toast on save failure', async () => {
        server.use(
            http.post('*/user/project/new', () => {
                return HttpResponse.json({ error: 'Failed to create' }, { status: 400 });
            })
        );

        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <ManageProject />
            </MemoryRouter>
        );

        await screen.findByText('Core Information');

        // Go to last tab
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        fireEvent.click(screen.getByRole('button', { name: /Create Project/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to create');
        });
    });
});
