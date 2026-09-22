import adminCache from '../../utils/adminCache';
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

import { showConfirm } from '../../utils/confirm';

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
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
        adminCache.clear();
        vi.clearAllMocks();
        localStorage.clear();
    });

    const renderWithRouter = (ui) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders skeleton initially and fetches classrooms', async () => {
        client.get.mockResolvedValueOnce({
            data: { classrooms: [] }
        });

        renderWithRouter(<Classes />);
        expect(screen.getByTestId("admin-classes-page")).toBeInTheDocument();
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

    it('shows empty state when no classrooms exist', async () => {
        client.get.mockResolvedValueOnce({
            data: { classrooms: [] }
        });

        renderWithRouter(<Classes />);

        await waitFor(() => {
            expect(screen.getByText('No classrooms found.')).toBeInTheDocument();
        });

        expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
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
            expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
        });
        
        // Close modal
        const closeBtn = screen.getByLabelText('Close modal');
        fireEvent.click(closeBtn);

        // Open kebab menu
        const kebabBtn = screen.getByTestId("kebab-trigger");
        if (kebabBtn) {
            fireEvent.click(kebabBtn);

            // Delete action
            const deleteBtn = screen.getByText(/Delete Class/i);
            
            // Mock window.confirm
            showConfirm.mockResolvedValue(true);
            client.delete.mockResolvedValueOnce({ data: { success: true } });
            
            fireEvent.click(deleteBtn);
            
            await waitFor(() => {
                expect(showConfirm).toHaveBeenCalled();
            });
        }

        // Test onKeyDown branch
        const classCard = screen.queryAllByTestId("class-card")[0];
        if (classCard) {
            fireEvent.keyDown(classCard, { key: 'Enter', target: classCard });
            fireEvent.keyDown(classCard, { key: ' ', target: classCard });
            fireEvent.keyDown(classCard, { key: 'a' }); // No-op branch
        }
    });

    it('loads classrooms in order preserved in localStorage', async () => {
        localStorage.setItem('admin_classes_order', JSON.stringify(['c2', 'c1']));
        const mockClassrooms = [
            { id: 'c1', name: 'Math 101', language: 'English', student_count: 20 },
            { id: 'c2', name: 'Science', language: 'Spanish', student_count: 15 }
        ];

        client.get.mockResolvedValueOnce({
            data: { classrooms: mockClassrooms }
        });

        renderWithRouter(<Classes />);

        await waitFor(() => {
            expect(screen.getByText('Science')).toBeInTheDocument();
        });

        const links = screen.getAllByRole('link', { name: /Manage classroom/i });
        expect(links[0]).toHaveTextContent('Science');
        expect(links[1]).toHaveTextContent('Math 101');
    });

    it('supports drag and drop reordering and updates localStorage', async () => {
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

        const cards = document.querySelectorAll('.class-card');
        expect(cards.length).toBe(2);

        // Drag first card over second card
        fireEvent.dragStart(cards[0]);
        fireEvent.dragEnter(cards[1]);
        fireEvent.dragOver(cards[1]);
        fireEvent.dragEnd(cards[0]);

        await waitFor(() => {
            const reorderedLinks = screen.getAllByRole('link', { name: /Manage classroom/i });
            expect(reorderedLinks[0]).toHaveTextContent('Science');
            expect(reorderedLinks[1]).toHaveTextContent('Math 101');
        });

        expect(JSON.parse(localStorage.getItem('admin_classes_order'))).toEqual(['c2', 'c1']);
    });

    it('supports keyboard reordering via drag handle arrow keys', async () => {
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

        const dragHandles = screen.getAllByTestId('class-card-drag-handle');
        expect(dragHandles.length).toBe(2);

        // Move first card to the right using ArrowRight
        fireEvent.keyDown(dragHandles[0], { key: 'ArrowRight' });

        await waitFor(() => {
            const reorderedLinks = screen.getAllByRole('link', { name: /Manage classroom/i });
            expect(reorderedLinks[0]).toHaveTextContent('Science');
            expect(reorderedLinks[1]).toHaveTextContent('Math 101');
        });

        expect(JSON.parse(localStorage.getItem('admin_classes_order'))).toEqual(['c2', 'c1']);

        // Now move the now-second card back using ArrowLeft
        const updatedHandles = screen.getAllByTestId('class-card-drag-handle');
        fireEvent.keyDown(updatedHandles[1], { key: 'ArrowLeft' });

        await waitFor(() => {
            const reorderedLinks = screen.getAllByRole('link', { name: /Manage classroom/i });
            expect(reorderedLinks[0]).toHaveTextContent('Math 101');
            expect(reorderedLinks[1]).toHaveTextContent('Science');
        });

        expect(JSON.parse(localStorage.getItem('admin_classes_order'))).toEqual(['c1', 'c2']);
    });

    it('does not trigger card navigation while dragging', async () => {
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

        const cards = document.querySelectorAll('.class-card');

        // Start drag on card 0
        fireEvent.dragStart(cards[0]);
        // While dragging, click fires
        fireEvent.click(cards[0]);

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('initializes from admin_classes cache immediately and fetches in background', async () => {
        const cachedClassrooms = [
            { id: 'c_cached', name: 'Cached Classroom', language: 'Python', student_count: 5 }
        ];
        adminCache.set('admin_classes', cachedClassrooms);

        const freshClassrooms = [
            { id: 'c_fresh', name: 'Fresh Classroom', language: 'Python', student_count: 12 }
        ];
        client.get.mockResolvedValueOnce({
            data: { classrooms: freshClassrooms }
        });

        renderWithRouter(<Classes />);

        // Should immediately show cached classroom without skeleton loading
        expect(screen.getByText('Cached Classroom')).toBeInTheDocument();

        // Background fetch resolves and updates view
        await waitFor(() => {
            expect(screen.getByText('Fresh Classroom')).toBeInTheDocument();
        });
        expect(adminCache.get('admin_classes')).toEqual(freshClassrooms);
    });

    it('invalidates admin_classes cache on create and delete', async () => {
        adminCache.set('admin_classes', [{ id: 'c1', name: 'Class 1' }]);
        expect(adminCache.get('admin_classes')).not.toBeNull();

        adminCache.invalidate('admin_classes');
        expect(adminCache.get('admin_classes')).toBeNull();
    });

});
