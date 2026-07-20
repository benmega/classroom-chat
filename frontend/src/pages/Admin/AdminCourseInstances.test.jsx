import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminCourseInstances from './AdminCourseInstances';
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

describe('AdminCourseInstances', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mocks
        client.get.mockImplementation((url) => {
            if (url === '/api/admin/crud/courseinstance') {
                return Promise.resolve({ data: { data: [{ id: 'inst1', classroom_id: 'class1', course_id: 'course1' }] } });
            }
            if (url === '/api/admin/crud/classroom') {
                return Promise.resolve({ data: { data: [{ id: 'class1', name: 'Class 1' }] } });
            }
            if (url === '/api/admin/crud/course') {
                return Promise.resolve({ data: { data: [{ id: 'course1', name: 'Course 1' }] } });
            }
            if (url === '/api/course-requests/pending') {
                return Promise.resolve({
                    data: {
                        requests: [
                            {
                                id: 1,
                                student_username: 'student1',
                                course_instance_id: 'pending_inst_1',
                                requested_course_id: 'course1',
                                url: 'http://test.url',
                                student_classrooms: [{ id: 'class1', name: 'Class 1' }]
                            }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: { data: [] } });
        });
    });

    const renderComponent = () => render(<BrowserRouter><AdminCourseInstances /></BrowserRouter>);

    it('renders instances and pending requests table', async () => {
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('inst1')).toBeInTheDocument();
            expect(screen.getByText('Pending Student Requests')).toBeInTheDocument();
            expect(screen.getByText('student1')).toBeInTheDocument();
            expect(screen.getByText('pending_inst_1')).toBeInTheDocument();
        });
    });

    it('opens approve modal with correct defaults and submits', async () => {
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('pending_inst_1')).toBeInTheDocument();
        });

        // Click approve button (Check icon)
        const approveBtn = screen.getByTitle('Approve Request');
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(screen.getByText('Approve Course Instance')).toBeInTheDocument();
        });

        // The ID should be prepopulated and disabled
        const idInput = screen.getByDisplayValue('pending_inst_1');
        expect(idInput).toBeDisabled();

        // Submit form
        client.post.mockResolvedValueOnce({ data: { success: true } });
        const saveBtn = screen.getByText('Save Instance');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/course-requests/1/approve', expect.objectContaining({
                classroom_id: 'class1',
                course_id: 'course1'
            }));
            expect(toast.success).toHaveBeenCalledWith('Course Instance Request approved.');
        });
    });

    it('rejects a pending request', async () => {
        window.confirm = vi.fn(() => true);
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('pending_inst_1')).toBeInTheDocument();
        });

        // Click reject button (X icon)
        const rejectBtn = screen.getByTitle('Reject Request');
        fireEvent.click(rejectBtn);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(client.post).toHaveBeenCalledWith('/api/course-requests/1/reject');
        });
    });
});
