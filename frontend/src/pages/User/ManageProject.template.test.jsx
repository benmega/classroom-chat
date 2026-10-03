import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ManageProject from './ManageProject';
import useAuthStore from '../../store/useAuthStore';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';

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

describe('ManageProject - template link (template_id)', () => {
    const templates = {
        'Template A': { id: 11, description: 'A desc' },
        'Template B': { id: 12, description: 'B desc' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({
            user: { username: 'testuser', role: 'student' },
            checkAuth: vi.fn(),
            isAuthenticated: true,
            isChecking: false,
        });
        server.use(
            http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates } }))
        );
    });

    const renderCreate = () => render(
        <MemoryRouter initialEntries={['/manage-project']}>
            <Routes>
                <Route path="/manage-project" element={<ManageProject />} />
                <Route path="/profile" element={<ProfilePage />} />
            </Routes>
        </MemoryRouter>
    );

    const renderEdit = () => render(
        <MemoryRouter initialEntries={['/manage-project/1']}>
            <Routes>
                <Route path="/manage-project/:projectId" element={<ManageProject />} />
                <Route path="/profile" element={<ProfilePage />} />
            </Routes>
        </MemoryRouter>
    );

    const submit = async (buttonName) => {
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: /Next/i }));
        fireEvent.click(screen.getByRole('button', { name: buttonName }));
        await waitFor(() => expect(screen.getByTestId('profile-page')).toBeInTheDocument());
    };

    it('sends the selected template id when creating a project', async () => {
        let sent = null;
        server.use(
            http.post('*/user/project/new', async ({ request }) => {
                sent = await request.formData();
                return HttpResponse.json({ status: 'success', data: { project: { id: 2 } } });
            })
        );

        renderCreate();
        await screen.findByText('Core Information');
        await screen.findByRole('option', { name: 'Template B' });
        fireEvent.change(screen.getByLabelText('Project Type / Template'), { target: { value: 'Template B' } });

        await submit(/Create Project/i);
        expect(sent.get('template_id')).toBe('12');
        expect(sent.get('name')).toBe('Template B');
    });

    it('does not send template_id for a custom project on create', async () => {
        let sent = null;
        server.use(
            http.post('*/user/project/new', async ({ request }) => {
                sent = await request.formData();
                return HttpResponse.json({ status: 'success', data: { project: { id: 2 } } });
            })
        );

        renderCreate();
        await screen.findByText('Core Information');
        fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Freeform' } });

        await submit(/Create Project/i);
        expect(sent.has('template_id')).toBe(false);
    });

    it('preselects the template by template_id even when the project was renamed', async () => {
        let sent = null;
        server.use(
            http.get('*/user/project/edit/1', () => HttpResponse.json({
                status: 'success',
                data: { project: { id: 1, name: 'My Renamed Thing', template_id: 12 } },
            })),
            http.post('*/user/project/edit/1', async ({ request }) => {
                sent = await request.formData();
                return HttpResponse.json({ status: 'success' });
            })
        );

        renderEdit();
        await waitFor(() => expect(screen.getByLabelText('Project Type / Template')).toHaveValue('Template B'));
        expect(screen.getByDisplayValue('My Renamed Thing')).toBeInTheDocument();

        await submit(/Update Project/i);
        expect(sent.get('template_id')).toBe('12');
        expect(sent.get('name')).toBe('My Renamed Thing');
    });

    it('falls back to an exact name match for projects without template_id', async () => {
        server.use(
            http.get('*/user/project/edit/1', () => HttpResponse.json({
                status: 'success',
                data: { project: { id: 1, name: 'template a', template_id: null } },
            }))
        );

        renderEdit();
        await waitFor(() => expect(screen.getByLabelText('Project Type / Template')).toHaveValue('Template A'));
    });

    it('sends an empty template_id when editing a custom project', async () => {
        let sent = null;
        server.use(
            http.get('*/user/project/edit/1', () => HttpResponse.json({
                status: 'success',
                data: { project: { id: 1, name: 'Custom Thing', template_id: null } },
            })),
            http.post('*/user/project/edit/1', async ({ request }) => {
                sent = await request.formData();
                return HttpResponse.json({ status: 'success' });
            })
        );

        renderEdit();
        await screen.findByText('Core Information');
        await screen.findByRole('option', { name: 'Template A' });
        expect(screen.getByLabelText('Project Type / Template')).toHaveValue('custom');

        await submit(/Update Project/i);
        // "null" tells the server to clear the link (the backend also accepts "")
        expect(sent.get('template_id')).toBe('null');
    });
});
