import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminStandardProjects from './AdminStandardProjects';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

vi.mock('../../hooks/useSidebar', () => ({
    default: () => ({
        isOpen: true,
        toggleSidebar: vi.fn(),
    })
}));

describe('AdminStandardProjects', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (ui) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders loading initially and fetches projects', async () => {
        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText('No standard projects found.')).toBeInTheDocument();
        });
    });

    it('displays fetched standard projects', async () => {
        const mockProjects = {
            1: { id: 1, name: 'Project 1', description: 'Desc 1' },
            2: { id: 2, name: 'Project 2', description: 'Desc 2', image_url: 'image.png' }
        };

        client.get.mockResolvedValueOnce({
            data: { status: 'success', data: { templates: mockProjects } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        await waitFor(() => {
            expect(screen.getByText('Project 1')).toBeInTheDocument();
        });
        expect(screen.getByText('Project 2')).toBeInTheDocument();
        expect(screen.getByText('Desc 1')).toBeInTheDocument();
    });

    it('opens add modal, fills form, and submits new project', async () => {
        client.get.mockResolvedValue({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Add Project/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Add Project/i }));
        
        expect(screen.getByText('Project Name')).toBeInTheDocument();
        
        const nameInput = screen.getByPlaceholderText(/e.g. Text-Based Adventure/i);
        fireEvent.change(nameInput, { target: { value: 'New Template' } });

        const descInput = screen.getByPlaceholderText(/Description template.../i);
        fireEvent.change(descInput, { target: { value: 'New Desc' } });

        const conceptsInput = screen.getByPlaceholderText(/e.g. Variables/i);
        fireEvent.change(conceptsInput, { target: { value: 'Vars, Loops' } });

        const goalsInput = screen.getByPlaceholderText(/e.g. Create a branching/i);
        fireEvent.change(goalsInput, { target: { value: 'Goal 1\nGoal 2' } });

        client.post.mockResolvedValueOnce({
            data: { status: 'success', message: 'Created successfully.' }
        });

        const saveButtonsNew = screen.getAllByRole('button', { name: /Save Template/i })
            .filter(el => el.tagName === 'BUTTON');
        fireEvent.submit(saveButtonsNew[0].closest('form'));
        
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/project-templates', expect.objectContaining({
                name: 'New Template',
                description: 'New Desc',
                concepts: ['Vars', 'Loops'],
                goals: ['Goal 1', 'Goal 2']
            }));
        });
    });

    it('shows error if project name is empty', async () => {
        client.get.mockResolvedValue({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminStandardProjects />);
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Add Project/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Add Project/i }));
        
        const saveButtonsNew = screen.getAllByRole('button', { name: /Save Template/i })
            .filter(el => el.tagName === 'BUTTON');
        fireEvent.submit(saveButtonsNew[0].closest('form'));

        expect(toast.error).toHaveBeenCalledWith('Project Name is required.');
    });

    it('opens edit modal and updates existing project', async () => {
        const mockProjects = {
            1: { id: 1, name: 'Project 1', description: 'Desc 1', concepts: ['C1'], goals: ['G1'] }
        };

        client.get.mockResolvedValue({
            data: { status: 'success', data: { templates: mockProjects } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        await waitFor(() => {
            expect(screen.getByText('Project 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Project 1').closest('.project-card'));
        
        const nameInput = screen.getByPlaceholderText(/e.g. Text-Based Adventure/i);
        expect(nameInput).toHaveValue('Project 1');
        
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });

        client.put.mockResolvedValueOnce({
            data: { status: 'success', message: 'Updated successfully.' }
        });

        const saveButtons = screen.getAllByRole('button', { name: /Save Template/i })
            .filter(el => el.tagName === 'BUTTON');
        fireEvent.submit(saveButtons[0].closest('form'));
        
        await waitFor(() => {
            expect(client.put).toHaveBeenCalledWith('/api/project-templates/1', expect.objectContaining({
                name: 'Updated Project'
            }));
        });
    });

    it('deletes a project after confirmation', async () => {
        const mockProjects = {
            1: { id: 1, name: 'Project 1', description: 'Desc 1' }
        };

        client.get.mockResolvedValue({
            data: { status: 'success', data: { templates: mockProjects } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        await waitFor(() => {
            expect(screen.getByText('Project 1')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        client.delete.mockResolvedValueOnce({
            data: { status: 'success', message: 'Deleted successfully.' }
        });

        fireEvent.click(screen.getByTitle(/Delete Project/i));

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Project 1"?');
        
        await waitFor(() => {
            expect(client.delete).toHaveBeenCalledWith('/api/project-templates/1');
        });
        
        confirmSpy.mockRestore();
    });

    it('cancels deletion if not confirmed', async () => {
        const mockProjects = {
            1: { id: 1, name: 'Project 1', description: 'Desc 1' }
        };

        client.get.mockResolvedValue({
            data: { status: 'success', data: { templates: mockProjects } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        await waitFor(() => {
            expect(screen.getByText('Project 1')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

        fireEvent.click(screen.getByTitle(/Delete Project/i));

        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Project 1"?');
        
        expect(client.delete).not.toHaveBeenCalled();
        
        confirmSpy.mockRestore();
    });

    it('closes the modal on cancel', async () => {
        client.get.mockResolvedValue({
            data: { status: 'success', data: { templates: {} } }
        });

        renderWithRouter(<AdminStandardProjects />);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Add Project/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Add Project/i }));
        expect(screen.getByPlaceholderText(/e.g. Text-Based Adventure/i)).toBeInTheDocument();
        
        const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButtons[0]);
        
        expect(screen.queryByPlaceholderText(/e.g. Text-Based Adventure/i)).not.toBeInTheDocument();
    });
});
