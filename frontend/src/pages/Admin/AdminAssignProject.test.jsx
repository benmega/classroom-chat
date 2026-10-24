import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminAssignProject from './AdminAssignProject';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    }
}));

vi.mock('../../hooks/useSidebar', () => ({
    default: () => ({
        isOpen: true,
        toggleSidebar: vi.fn(),
    })
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AdminAssignProject', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (ui) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders initial core tab and fetches standard projects', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {1: { id: 1, name: 'Standard Project 1' }} } }
        });

        renderWithRouter(<AdminAssignProject />);
        expect(screen.getAllByText('Assign Project').length).toBeGreaterThan(0);
        
        await waitFor(() => {
            expect(client.get).toHaveBeenCalledWith('/api/project-templates');
        });
        
        // The form has two selects (template and project type), so the template one is found by its label.
        const select = screen.getByLabelText(/Standard Project Template/);
        expect(select).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Standard Project 1')).toBeInTheDocument();
        });
    });

    it('searches for users and selects one', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminAssignProject />);
        
        const searchInput = screen.getByPlaceholderText(/search/i);
        
        // Mock the debounced search request
        client.get.mockResolvedValueOnce({
            data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
        });
        
        fireEvent.change(searchInput, { target: { value: 'test' } });
        
        await waitFor(() => {
            expect(client.get).toHaveBeenCalledWith(expect.stringContaining('/api/admin/users?search=test'));
        });
        
        await waitFor(() => {
            expect(screen.getByText('Test User (testuser) - #42')).toBeInTheDocument();
        });
        
        fireEvent.click(screen.getByText('Test User (testuser) - #42'));
        
        expect(screen.getByText('Test User (testuser) - #42')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    it('validates form on submit', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminAssignProject />);
        
        // Try submitting without user
        fireEvent.submit(screen.getAllByText(/Assign Project/i)[1].closest('form'));
        expect(toast.error).toHaveBeenCalledWith('Please select a student.');
        
        // Select user
        const searchInput = screen.getByPlaceholderText(/search/i);
        client.get.mockResolvedValueOnce({
            data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
        });
        fireEvent.change(searchInput, { target: { value: 'test' } });
        
        await waitFor(() => {
            expect(screen.getByText('Test User (testuser) - #42')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText('Test User (testuser) - #42'));
        
        // Try submitting without name
        fireEvent.submit(screen.getAllByText(/Assign Project/i)[1].closest('form'));
        
        // wait... the HTML form might block it before toast if `required` is there. But we fireEvent.submit to test if HTML blocks, or fireEvent.click on submit. 
        // Actually react-testing-library click on a submit button inside a form with invalid required inputs might still call the handler depending on environment, or we can just mock standard behavior.
        // Let's just bypass by testing the toast.
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Project Name is required.');
        });
    });

    it('submits form successfully', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminAssignProject />);
        
        // Select user
        const searchInput = screen.getByPlaceholderText(/search/i);
        client.get.mockResolvedValueOnce({
            data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
        });
        fireEvent.change(searchInput, { target: { value: 'test' } });
        await waitFor(() => {
            fireEvent.click(screen.getByText('Test User (testuser) - #42'));
        });
        
        // Fill name
        const nameInput = screen.getByPlaceholderText(/awesome game/i);
        fireEvent.change(nameInput, { target: { value: 'Cool Project' } });
        
        // Fill description to trigger adjustTextareaHeight
        const descInput = screen.getByPlaceholderText(/story of your project/i);
        fireEvent.change(descInput, { target: { value: 'Cool description' } });
        
        // Submit
        client.post.mockResolvedValueOnce({
            data: { status: 'success', message: 'Assigned!' }
        });
        
        // We use submit on the form
        fireEvent.submit(screen.getAllByText(/Assign Project/i)[1].closest('form'));
        
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/assign-project', expect.objectContaining({
                name: 'Cool Project',
                user_id: 42,
                project_type: 'code'
            }));
        });
        
        expect(mockNavigate).toHaveBeenCalledWith('/admin/to-review');
    });

    it('navigates between tabs and updates form values from standard project', async () => {
        const mockStandardProject = {
            id: 1, name: 'SP', description: 'Desc', link: 'http', github_link: 'http', video_url: 'http', code_snippet: 'code', image_url: 'http'
        };
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {1: mockStandardProject} } }
        });

        renderWithRouter(<AdminAssignProject />);
        
        await waitFor(() => {
            expect(screen.getByText('SP')).toBeInTheDocument();
        });
        
        const select = screen.getByLabelText(/Standard Project Template/);
        fireEvent.change(select, { target: { value: '1' } });
        
        const assignedNameInput = screen.getByPlaceholderText(/awesome game/i);
        expect(assignedNameInput).toHaveValue('SP');
        expect(screen.getByDisplayValue('Desc')).toBeInTheDocument();
        
        // Media Tab
        fireEvent.click(screen.getByText('Media & Links'));
        expect(screen.getByPlaceholderText(/youtube\.com/i)).toHaveValue('http');
        
        // Code Tab
        fireEvent.click(screen.getByText('Code Showcase'));
        expect(screen.getByPlaceholderText(/def my_awesome_logic/)).toHaveValue('code');
    });

    it('shows the reason the server gives when the assignment fails', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminAssignProject />);

        client.get.mockResolvedValueOnce({
            data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
        });
        fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'test' } });
        await waitFor(() => {
            fireEvent.click(screen.getByText('Test User (testuser) - #42'));
        });
        fireEvent.change(screen.getByPlaceholderText(/awesome game/i), { target: { value: 'Cool Project' } });

        client.post.mockRejectedValueOnce({ response: { status: 400, data: { status: 'error', data: null, error: 'Invalid student selection.' } } });
        fireEvent.submit(screen.getAllByText(/Assign Project/i)[1].closest('form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Invalid student selection.');
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    describe('project type', () => {
        const openPage = async (templates = {}) => {
            client.get.mockResolvedValueOnce({ data: { status: 'success', data: { templates } } });
            renderWithRouter(<AdminAssignProject />);
            await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/project-templates'));
        };

        const pickStudent = async () => {
            client.get.mockResolvedValueOnce({
                data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
            });
            fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'test' } });
            fireEvent.click(await screen.findByText('Test User (testuser) - #42'));
        };

        const pickTemplate = (id) => {
            fireEvent.change(screen.getByLabelText(/Standard Project Template/), { target: { value: String(id) } });
        };

        const submit = () => {
            fireEvent.submit(screen.getByRole('button', { name: /Assign Project/ }).closest('form'));
        };

        it('offers both types and starts on a code project', async () => {
            await openPage();

            const select = screen.getByLabelText('Project type');

            expect(select).toHaveValue('code');
            expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual(['Code project', '3D model']);
        });

        it('sends the type that was picked', async () => {
            await openPage();
            await pickStudent();
            fireEvent.change(screen.getByPlaceholderText(/awesome game/i), { target: { value: 'Robot Arm' } });
            fireEvent.change(screen.getByLabelText('Project type'), { target: { value: '3d' } });
            client.post.mockResolvedValueOnce({ data: { status: 'success', message: 'Assigned!' } });

            submit();

            await waitFor(() => {
                expect(client.post).toHaveBeenCalledWith('/api/admin/assign-project', expect.objectContaining({
                    name: 'Robot Arm',
                    user_id: 42,
                    project_type: '3d'
                }));
            });
            expect(mockNavigate).toHaveBeenCalledWith('/admin/to-review');
        });

        it('prefills the type from the chosen standard project and sends it', async () => {
            await openPage({ 1: { id: 1, name: 'Marble Run', project_type: '3d' } });
            await screen.findByText('Marble Run');

            pickTemplate(1);

            expect(screen.getByLabelText('Project type')).toHaveValue('3d');

            await pickStudent();
            client.post.mockResolvedValueOnce({ data: { status: 'success', message: 'Assigned!' } });
            submit();

            await waitFor(() => {
                expect(client.post).toHaveBeenCalledWith('/api/admin/assign-project', expect.objectContaining({
                    name: 'Marble Run',
                    project_type: '3d'
                }));
            });
        });

        it('lets the admin change the prefilled type before assigning', async () => {
            await openPage({ 1: { id: 1, name: 'Marble Run', project_type: '3d' } });
            await screen.findByText('Marble Run');
            pickTemplate(1);
            fireEvent.change(screen.getByLabelText('Project type'), { target: { value: 'code' } });

            await pickStudent();
            client.post.mockResolvedValueOnce({ data: { status: 'success', message: 'Assigned!' } });
            submit();

            await waitFor(() => {
                expect(client.post).toHaveBeenCalledWith('/api/admin/assign-project', expect.objectContaining({
                    name: 'Marble Run',
                    project_type: 'code'
                }));
            });
        });

        it('falls back to a code project for a standard project without a type', async () => {
            await openPage({
                1: { id: 1, name: 'Marble Run', project_type: '3d' },
                2: { id: 2, name: 'Quiz Game' },
            });
            await screen.findByText('Quiz Game');
            pickTemplate(1);
            expect(screen.getByLabelText('Project type')).toHaveValue('3d');

            pickTemplate(2);

            expect(screen.getByLabelText('Project type')).toHaveValue('code');
        });
    });

    describe('accessible names', () => {
        it('names the button that clears the chosen student', async () => {
            client.get.mockResolvedValueOnce({
                data: { status: 'success', data: { templates: {} } }
            });
            renderWithRouter(<AdminAssignProject />);
            client.get.mockResolvedValueOnce({
                data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
            });
            fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'test' } });
            fireEvent.click(await screen.findByText('Test User (testuser) - #42'));

            const clear = screen.getByRole('button', { name: 'Clear selected student' });
            expect(clear).toHaveAttribute('type', 'button');
            fireEvent.click(clear);

            expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
        });

        it('names the code snippet box', async () => {
            client.get.mockResolvedValueOnce({
                data: { status: 'success', data: { templates: {} } }
            });
            renderWithRouter(<AdminAssignProject />);

            fireEvent.click(screen.getByText('Code Showcase'));

            expect(screen.getByRole('textbox', { name: 'Code snippet' })).toBeInTheDocument();
        });

        it('gives the preview demo-link button a name and no bogus href', async () => {
            client.get.mockResolvedValueOnce({
                data: { status: 'success', data: { templates: { 1: { id: 1, name: 'SP', link: 'https://demo.example' } } } }
            });
            renderWithRouter(<AdminAssignProject />);
            await screen.findByText('SP');
            fireEvent.change(screen.getByLabelText(/Standard Project Template/), { target: { value: '1' } });

            const demo = screen.getByRole('button', { name: 'Demo link (preview)' });

            expect(demo).not.toHaveAttribute('href');
            expect(demo).toHaveAttribute('type', 'button');
        });
    });
});
