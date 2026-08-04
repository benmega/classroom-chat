import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
        
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(screen.getByText('Standard Project 1')).toBeInTheDocument();
    });

    it('searches for users and selects one', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminAssignProject />);
        
        const searchInput = screen.getByPlaceholderText('Type to search by username or nickname...');
        
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
        expect(screen.queryByPlaceholderText('Type to search by username or nickname...')).not.toBeInTheDocument();
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
        const searchInput = screen.getByPlaceholderText('Type to search by username or nickname...');
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
        const searchInput = screen.getByPlaceholderText('Type to search by username or nickname...');
        client.get.mockResolvedValueOnce({
            data: { users: [{ id: 42, username: 'testuser', nickname: 'Test User' }] }
        });
        fireEvent.change(searchInput, { target: { value: 'test' } });
        await waitFor(() => {
            fireEvent.click(screen.getByText('Test User (testuser) - #42'));
        });
        
        // Fill name
        const nameInput = screen.getByPlaceholderText('e.g. My Awesome Game');
        fireEvent.change(nameInput, { target: { value: 'Cool Project' } });
        
        // Submit
        client.post.mockResolvedValueOnce({
            data: { status: 'success', message: 'Assigned!' }
        });
        
        // We use submit on the form
        fireEvent.submit(screen.getAllByText(/Assign Project/i)[1].closest('form'));
        
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/assign-project', expect.objectContaining({
                name: 'Cool Project',
                user_id: 42
            }));
        });
        
        expect(mockNavigate).toHaveBeenCalledWith('/admin/projects');
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
        
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '1' } });
        
        const assignedNameInput = screen.getByPlaceholderText('e.g. My Awesome Game');
        expect(assignedNameInput).toHaveValue('SP');
        expect(screen.getByDisplayValue('Desc')).toBeInTheDocument();
        
        // Media Tab
        fireEvent.click(screen.getByText('Media & Links'));
        expect(screen.getByPlaceholderText('https://youtube.com/...')).toHaveValue('http');
        
        // Code Tab
        fireEvent.click(screen.getByText('Code Showcase'));
        expect(screen.getByPlaceholderText(/def my_awesome_logic/)).toHaveValue('code');
    });
});
