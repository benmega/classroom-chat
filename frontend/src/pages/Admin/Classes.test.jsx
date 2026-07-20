import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Classes from './Classes';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
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

        fireEvent.click(screen.getByText('Math 101'));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/classes/c1');
    });

    it('opens bulk connection modal on global button click', async () => {
        client.get.mockResolvedValue({
            data: { classrooms: [] }
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Classroom Directory')).toBeInTheDocument();
        });

        const printBtn = screen.getByRole('button', { name: /Print Connection Cards/i });
        fireEvent.click(printBtn);
        
        // Wait for modal to render or some state update
        await waitFor(() => {
            expect(document.querySelector('.admin-modal-overlay') || document.querySelector('.modal-content')).not.toBeNull();
        });
    });

    it('fetches classroom cards and opens modal on individual print button click', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 }
        ];

        client.get.mockImplementation((url) => {
            if (url.includes('connection_cards')) {
                return Promise.resolve({ data: { cards: [{ id: 'card1' }] } });
            }
            return Promise.resolve({ data: { classrooms: mockClassrooms } });
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101')).toBeInTheDocument();
        });

        const printBtn = screen.getByTitle('Print Connection Cards');
        fireEvent.click(printBtn);

        await waitFor(() => {
            expect(client.get).toHaveBeenCalledWith('/api/admin/classrooms/c1/connection_cards');
        });
    });

    it('handles individual card fetch error', async () => {
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 }
        ];

        client.get.mockImplementation((url) => {
            if (url.includes('connection_cards')) {
                return Promise.reject(new Error('Card error'));
            }
            return Promise.resolve({ data: { classrooms: mockClassrooms } });
        });

        renderWithRouter(<Classes />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101')).toBeInTheDocument();
        });

        const printBtn = screen.getByTitle('Print Connection Cards');
        fireEvent.click(printBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load cohort connection cards.');
        });
    });
});
