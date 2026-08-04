import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProjectInfo from './ProjectInfo';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

vi.mock('../../store/useAuthStore', () => ({
    default: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ projectId: '1' }),
        useLocation: () => ({ state: null }),
        Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    };
});

describe('ProjectInfo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.mockReturnValue({
            user: { id: 10, username: 'student' }
        });
    });

    const renderWithRouter = (ui) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('shows loading state initially', () => {
        // Mock promises that don't resolve immediately to test loading state
        client.get.mockImplementation(() => new Promise(() => {}));
        renderWithRouter(<ProjectInfo />);
        expect(screen.getByText('Loading project details...')).toBeInTheDocument();
    });

    it('fetches project template if not provided in state', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/api/project-templates') {
                return Promise.resolve({
                    data: { data: { templates: { '1': { id: '1', name: 'Test Project', description: 'Test Description' } } } }
                });
            }
            if (url === '/user/profile') {
                return Promise.resolve({
                    data: { data: { target: { projects: [] } } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<ProjectInfo />);

        await waitFor(() => {
            expect(screen.getByText('Test Project')).toBeInTheDocument();
        });
        expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('handles error if project template not found', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/api/project-templates') {
                return Promise.resolve({
                    data: { data: { templates: {} } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<ProjectInfo />);

        await waitFor(() => {
            expect(screen.getByText('Project template not found.')).toBeInTheDocument();
        });
    });

    it('shows "Manage Project" link if already assigned', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/api/project-templates') {
                return Promise.resolve({
                    data: { data: { templates: { '1': { id: '1', name: 'Test Project' } } } }
                });
            }
            if (url === '/user/profile') {
                return Promise.resolve({
                    data: { data: { target: { projects: [{ id: '99', name: 'Test Project' }] } } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<ProjectInfo />);

        await waitFor(() => {
            expect(screen.getByText('Manage Project')).toBeInTheDocument();
        });
        
        const link = screen.getByText('Manage Project');
        expect(link.getAttribute('href')).toBe('/project/edit/99');
    });

    it('allows assigning a project to the user', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/api/project-templates') {
                return Promise.resolve({
                    data: { data: { templates: { '1': { id: '1', name: 'Test Project', description: 'Desc' } } } }
                });
            }
            if (url === '/user/profile') {
                return Promise.resolve({
                    data: { data: { target: { projects: [] } } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<ProjectInfo />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Assign to me/i })).toBeInTheDocument();
        });

        client.post.mockResolvedValueOnce({
            data: { status: 'success' }
        });

        const assignBtn = screen.getByRole('button', { name: /Assign to me/i });
        fireEvent.click(assignBtn);

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/user/project/new', expect.any(FormData));
        });
        
    });

    it('handles assignment error', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/api/project-templates') {
                return Promise.resolve({
                    data: { data: { templates: { '1': { id: '1', name: 'Test Project' } } } }
                });
            }
            if (url === '/user/profile') {
                return Promise.resolve({
                    data: { data: { target: { projects: [] } } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<ProjectInfo />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Assign to me/i })).toBeInTheDocument();
        });

        client.post.mockResolvedValueOnce({
            data: { status: 'error', error: 'Assignment failed' }
        });

        const assignBtn = screen.getByRole('button', { name: /Assign to me/i });
        fireEvent.click(assignBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Assignment failed');
        });
    });

    it('navigates back when clicking back button', async () => {
        client.get.mockImplementation((url) => {
            if (url === '/api/project-templates') {
                return Promise.resolve({
                    data: { data: { templates: { '1': { id: '1', name: 'Test Project' } } } }
                });
            }
            if (url === '/user/profile') {
                return Promise.resolve({
                    data: { data: { target: { projects: [] } } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<ProjectInfo />);

        await waitFor(() => {
            expect(screen.getByText('Back to Map')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Back to Map'));
        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
});
