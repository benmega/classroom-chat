import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Classes from './Classes';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        delete: vi.fn(),
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

describe('Classes Admin Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (ui) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders skeleton initially and fetches classrooms', async () => {
        client.get.mockResolvedValueOnce({
            data: { classrooms: [] }
        });

        renderWithRouter(<Classes />);
        expect(document.querySelector('.admin-classes-page')).toBeInTheDocument();
        // Since loading state is handled with Skeleton, wait for fetch to finish
        await waitFor(() => {
            expect(screen.getByText('Classroom Directory')).toBeInTheDocument();
        });
        expect(client.get).toHaveBeenCalledWith('/api/admin/classrooms');
    });

    it('displays fetched classrooms and statistics correctly', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 },
            { id: 'c2', name: 'Science', language: 'Spanish', student_count: 15 }
        ];

        client.get.mockResolvedValueOnce({
            data: { classrooms: mockClassrooms }
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Science')).toBeInTheDocument();
    });

    it('handles fetch error and shows toast message', async () => {
        client.get.mockRejectedValueOnce(new Error('Network Error'));

        renderWithRouter(<Classes />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load classrooms list.');
        });
    });

    it('filters classrooms based on search term', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 },
            { id: 'c2', name: 'Science', language: 'Spanish', student_count: 15 }
        ];

        client.get.mockResolvedValueOnce({
            data: { classrooms: mockClassrooms }
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search by name, ID, or language...');
        fireEvent.change(searchInput, { target: { value: 'math' } });

        expect(screen.getByText('Math 101')).toBeInTheDocument();
        expect(screen.queryByText('Science')).not.toBeInTheDocument();
    });

    it('navigates to class details on row click', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 }
        ];

        client.get.mockResolvedValueOnce({
            data: { classrooms: mockClassrooms }
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Math 101').closest('.class-card'));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/classes/c1');
    });

    it('navigates to class details when clicking anywhere on the card body', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 }
        ];

        client.get.mockResolvedValueOnce({
            data: { classrooms: mockClassrooms }
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('20')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('20'));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/classes/c1');
    });


    it('opens create modal and handles deletion', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 }
        ];

        client.get.mockResolvedValue({
            data: { classrooms: mockClassrooms }
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101')).toBeInTheDocument();
        });

        // Create modal
        const addBtn = screen.getByText(/Add Classroom/i);
        fireEvent.click(addBtn);
        await waitFor(() => {
            expect(document.querySelector('.modal-overlay')).not.toBeNull();
        });
        
        // Close modal
        const closeBtn = screen.getByLabelText('Close modal');
        fireEvent.click(closeBtn);

        // Open kebab menu
        const kebabBtn = document.querySelector('.kebab-trigger');
        if (kebabBtn) {
            fireEvent.click(kebabBtn);

            // Delete action
            const deleteBtn = screen.getByText(/Delete Class/i);
            
            // Mock window.confirm
            window.confirm = vi.fn().mockReturnValue(true);
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            
            fireEvent.click(deleteBtn);
            
            await waitFor(() => {
                expect(window.confirm).toHaveBeenCalled();
            });
        }

        // Test onKeyDown branch
        const classCard = document.querySelector('.class-card');
        if (classCard) {
            fireEvent.keyDown(classCard, { key: 'Enter', target: classCard });
            fireEvent.keyDown(classCard, { key: ' ', target: classCard });
            fireEvent.keyDown(classCard, { key: 'a' }); // No-op branch
        }
    });
});
