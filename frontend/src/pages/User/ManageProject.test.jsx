import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ManageProject from './ManageProject';
import useAuthStore from '../../store/useAuthStore';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

import { showConfirm } from '../../utils/confirm';

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
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
                return HttpResponse.json({ data: { templates: { 'Template A': {}, 'Template B': {} } } });
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
        expect(screen.getByPlaceholderText(/What is this project about\? What did you learn\?/i)).toBeInTheDocument();
        
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

    it('renders code snippet and teacher comment in preview', async () => {
        server.use(
            http.get('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'My Cool Game', description: 'A game I built', image_url: 'cover.jpg', teacher_comment: 'Great job!', code_snippet: 'print("hello")', link: 'http://example.com' } } });
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
        expect(screen.getByText('Teacher Note: Great job!')).toBeInTheDocument();
        expect(screen.getByText('print("hello")')).toBeInTheDocument();
    });

    it('navigates through tabs', async () => {
        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <ManageProject />
            </MemoryRouter>
        );

        expect(await screen.findByPlaceholderText(/What is this project about\? What did you learn\?/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        
        expect(await screen.findByText(/Media Assets/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/YouTube\/Vimeo URL/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        expect(screen.getByText('Code Showcase')).toBeInTheDocument();
        
        expect(screen.getByRole('button', { name: /Create Project/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Back/i }));
        expect(screen.getByText(/Media Assets/i)).toBeInTheDocument();
    });

    it('handles image and video file selection', async () => {
        render(
            <MemoryRouter initialEntries={['/manage-project']}>
                <ManageProject />
            </MemoryRouter>
        );

        await screen.findByText('Core Information');

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
        let sent;
        server.use(
            http.post('*/user/project/new', async ({ request }) => {
                sent = Object.fromEntries(await request.formData());
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

        await screen.findByPlaceholderText(/What is this project about\? What did you learn\?/i);
        fireEvent.change(screen.getByPlaceholderText(/What is this project about\? What did you learn\?/i), { target: { value: 'My cool desc' } });
        
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        const submitBtn = screen.getByRole('button', { name: /Create Project/i });
        fireEvent.click(submitBtn);

        expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId('profile-page')).toBeInTheDocument();
        });
        // What the form sent: the typed description, and no student, which only an admin assigns
        expect(sent.description).toBe('My cool desc');
        expect(toast.success).toHaveBeenCalledWith('Project created!');
    });

    it('updates project successfully', async () => {
        let sent;
        server.use(
            http.get('*/user/project/edit/1', async () => {
                return HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'Old Name' } } });
            }),
            http.post('*/user/project/edit/1', async ({ request }) => {
                sent = Object.fromEntries(await request.formData());
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

        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        const submitBtn = screen.getByRole('button', { name: /Update Project/i });
        fireEvent.click(submitBtn);

        // Back on the profile page, with the project saved under its own id
        expect(await screen.findByTestId('profile-page')).toBeInTheDocument();
        expect(sent.name).toBe('Old Name');
        expect(toast.success).toHaveBeenCalledWith('Project updated!');
    });

    it('deletes project after confirmation', async () => {
        showConfirm.mockResolvedValue(true);
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

        await waitFor(() => {
            expect(showConfirm).toHaveBeenCalledWith('Are you sure you want to delete this project?', { title: 'Delete Project', destructive: true });
        });

        await waitFor(() => {
            
            expect(screen.getByTestId('profile-page')).toBeInTheDocument();
        });
    });

    it('does not delete if confirmation is cancelled', async () => {
        showConfirm.mockResolvedValue(false);
        
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

        await waitFor(() => {
            expect(showConfirm).toHaveBeenCalledWith('Are you sure you want to delete this project?', { title: 'Delete Project', destructive: true });
        });
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

        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));

        fireEvent.click(screen.getByRole('button', { name: /Create Project/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to create');
        });
    });

    describe('admin controls', () => {
        const students = [
            { id: 5, username: 'amy', slug: 'amy-slug' },
            { id: 6, username: 'bob', slug: 'bob-slug' },
        ];
        let studentListRequests;

        beforeEach(() => {
            studentListRequests = 0;
            server.use(
                http.get('*/user/project/new', () => {
                    studentListRequests += 1;
                    return HttpResponse.json({ status: 'success', data: { students } });
                })
            );
        });

        const renderNewProject = () =>
            render(
                <MemoryRouter initialEntries={['/manage-project']}>
                    <Routes>
                        <Route path="/manage-project" element={<ManageProject />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/profile/:slug" element={<div data-testid="student-profile">Student profile</div>} />
                    </Routes>
                </MemoryRouter>
            );
        const goToLastTab = () => {
            fireEvent.click(screen.getByRole('button', { name: /Next/i }));
            fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        };

        it('shows the admin controls with every student to pick from', async () => {
            useAuthStore.setState({ user: { id: 1, username: 'teacher', role: 'admin' } });

            renderNewProject();
            await screen.findByText('Core Information');
            fireEvent.click(screen.getByRole('button', { name: /4. Review/i }));

            expect(await screen.findByText('Admin Controls')).toBeInTheDocument();
            const select = screen.getByLabelText('Assign to Student');
            await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
            expect(within(select).getByRole('option', { name: 'Select Student' })).toBeInTheDocument();
            expect(within(select).getByRole('option', { name: 'amy' })).toBeInTheDocument();
            expect(within(select).getByRole('option', { name: 'bob' })).toBeInTheDocument();
            expect(select).toBeRequired();
            expect(screen.getByLabelText('Teacher Comment')).toBeInTheDocument();
            expect(studentListRequests).toBe(1);
        });

        it('shows no admin controls to a student, and never asks for the student list', async () => {
            renderNewProject();

            await screen.findByText('Core Information');

            expect(screen.queryByText('Admin Controls')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Assign to Student')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Teacher Comment')).not.toBeInTheDocument();
            expect(studentListRequests).toBe(0);
        });

        it('shows no admin controls to a parent either', async () => {
            useAuthStore.setState({ user: { id: 2, username: 'mum', role: 'parent' } });
            renderNewProject();

            await screen.findByText('Core Information');

            expect(screen.queryByText('Admin Controls')).not.toBeInTheDocument();
            expect(studentListRequests).toBe(0);
        });

        it('sends the chosen student and the teacher comment, then opens that student\'s profile', async () => {
            useAuthStore.setState({ user: { id: 1, username: 'teacher', role: 'admin' } });
            let sent;
            server.use(
                http.post('*/user/project/new', async ({ request }) => {
                    sent = Object.fromEntries(await request.formData());
                    return HttpResponse.json({ status: 'success', data: { project: { id: 9 } } });
                })
            );
            renderNewProject();
            await screen.findByText('Core Information');
            fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Maze' } });
            
            fireEvent.click(screen.getByRole('button', { name: /4. Review/i }));
            const select = await screen.findByLabelText('Assign to Student');
            await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));

            fireEvent.change(select, { target: { value: '6' } });
            fireEvent.change(screen.getByLabelText('Teacher Comment'), { target: { value: 'Well done' } });

            fireEvent.click(screen.getByRole('button', { name: /Create Project/i }));

            expect(await screen.findByTestId('student-profile')).toBeInTheDocument();
            expect(sent.student_id).toBe('6');
            expect(sent.teacher_comment).toBe('Well done');
            expect(sent.name).toBe('Maze');
        });

        it('lets an admin rename a project that came from a template, which a student cannot', async () => {
            server.use(
                http.get('*/user/project/edit/1', () =>
                    HttpResponse.json({ status: 'success', data: { project: { id: 1, name: 'Template A', user_id: 5 } } })
                )
            );
            const open = () =>
                render(
                    <MemoryRouter initialEntries={['/manage-project/1']}>
                        <Routes>
                            <Route path="/manage-project/:projectId" element={<ManageProject />} />
                        </Routes>
                    </MemoryRouter>
                );

            const studentView = open();
            await screen.findByText('Core Information');
            expect(screen.getByLabelText('Project Name')).toHaveAttribute('readonly');
            studentView.unmount();

            useAuthStore.setState({ user: { id: 1, username: 'teacher', role: 'admin' } });
            open();
            await screen.findByText('Core Information');
            expect(screen.getByLabelText('Project Name')).not.toHaveAttribute('readonly');
        });

        it('shows the admin the owner and the earlier teacher comment of the project being edited', async () => {
            useAuthStore.setState({ user: { id: 1, username: 'teacher', role: 'admin' } });
            server.use(
                http.get('*/user/project/edit/1', () =>
                    HttpResponse.json({
                        status: 'success',
                        data: { project: { id: 1, name: 'Maze', user_id: 6, teacher_comment: 'Needs comments' } },
                    })
                )
            );
            render(
                <MemoryRouter initialEntries={['/manage-project/1']}>
                    <Routes>
                        <Route path="/manage-project/:projectId" element={<ManageProject />} />
                    </Routes>
                </MemoryRouter>
            );

            await screen.findByText('Core Information');
            fireEvent.click(screen.getByRole('button', { name: /4. Review/i }));

            const select = await screen.findByLabelText('Assign to Student');
            await waitFor(() => expect(select).toHaveValue('6'));
            expect(screen.getByLabelText('Teacher Comment')).toHaveValue('Needs comments');
        });
    });

    describe('keyboard and screen reader access', () => {
        const openProject = async () => {
            render(
                <MemoryRouter initialEntries={['/manage-project']}>
                    <ManageProject />
                </MemoryRouter>
            );
            await screen.findByText('Core Information');
        };

        it('makes the wizard steps real buttons and marks the current one', async () => {
            await openProject();

            const core = screen.getByRole('button', { name: '1. Core Info' });
            const media = screen.getByRole('button', { name: '2. Media' });
            const code = screen.getByRole('button', { name: '3. Code' });
            [core, media, code].forEach((step) => {
                expect(step.tagName).toBe('BUTTON');
                expect(step).toHaveAttribute('type', 'button');
            });
            expect(core).toHaveAttribute('aria-current', 'step');
            expect(media).not.toHaveAttribute('aria-current');
            expect(code).not.toHaveAttribute('aria-current');
        });

        it('switches steps with the mouse and keeps aria-current in step', async () => {
            await openProject();

            fireEvent.click(screen.getByRole('button', { name: '2. Media' }));
            expect(await screen.findByText('Media Assets')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '2. Media' })).toHaveAttribute('aria-current', 'step');
            expect(screen.getByRole('button', { name: '1. Core Info' })).not.toHaveAttribute('aria-current');

            fireEvent.click(screen.getByRole('button', { name: '3. Code' }));
            expect(screen.getByText('Code Showcase')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '3. Code' })).toHaveAttribute('aria-current', 'step');

            fireEvent.click(screen.getByRole('button', { name: '1. Core Info' }));
            expect(screen.getByText('Core Information')).toBeInTheDocument();
        });

        it('switches steps from the keyboard', async () => {
            const user = userEvent.setup();
            await openProject();

            screen.getByRole('button', { name: '2. Media' }).focus();
            await user.keyboard('{Enter}');
            expect(await screen.findByText('Media Assets')).toBeInTheDocument();

            await user.tab();
            expect(screen.getByRole('button', { name: '3. Code' })).toHaveFocus();
            await user.keyboard(' ');
            expect(screen.getByText('Code Showcase')).toBeInTheDocument();
        });

        it('names the video URL field', async () => {
            await openProject();
            fireEvent.click(screen.getByRole('button', { name: '2. Media' }));

            const field = await screen.findByRole('textbox', { name: 'Video URL (YouTube or Vimeo)' });
            expect(field).toHaveAttribute('placeholder', 'YouTube/Vimeo URL');
        });

        it('names the code snippet field', async () => {
            await openProject();
            fireEvent.click(screen.getByRole('button', { name: '3. Code' }));

            expect(await screen.findByRole('textbox', { name: 'Code snippet' })).toHaveAttribute('name', 'code_snippet');
        });

        it('keeps both file inputs focusable (visually hidden, not display:none)', async () => {
            const user = userEvent.setup();
            await openProject();
            fireEvent.click(screen.getByRole('button', { name: '2. Media' }));
            await screen.findByText('Media Assets');

            const image = screen.getByLabelText(/Upload Image/i);
            const video = screen.getByLabelText(/Upload Video/i);
            [image, video].forEach((input) => {
                expect(input).toHaveClass('sr-only');
                expect(input).not.toHaveAttribute('hidden');
            });

            screen.getByRole('button', { name: '3. Code' }).focus();
            await user.tab();
            expect(image).toHaveFocus();
            await user.tab();
            expect(screen.getByRole('textbox', { name: 'Video URL (YouTube or Vimeo)' })).toHaveFocus();
            await user.tab();
            expect(video).toHaveFocus();
        });
    });
});
