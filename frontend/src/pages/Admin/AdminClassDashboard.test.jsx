import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminClassDashboard from './AdminClassDashboard';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ classId: 'cls123' })
    };
});

describe('AdminClassDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (ui) => {
        return render(<BrowserRouter>{ui}</BrowserRouter>);
    };

    it('renders loading state initially', () => {
        client.get.mockImplementation(() => new Promise(() => {})); // Never resolves
        renderWithRouter(<AdminClassDashboard />);
        expect(document.querySelector('.skeleton-title')).toBeInTheDocument();
    });

    it('fetches and displays classroom details and students', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            language: 'Python',
                            course_id: 'py1',
                            url: 'http://example.com',
                            students: [
                                { id: 10, username: 'student1', nickname: 'John Doe', is_online: true }
                            ],
                            course_assignments: []
                        }
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({
                    data: {
                        users: [
                            { id: 10, username: 'student1', nickname: 'John Doe', role: 'student' },
                            { id: 11, username: 'student2', nickname: 'Jane Doe', role: 'student' }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });
        
        expect(screen.getByText('Python')).toBeInTheDocument(); // language badge
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('@student1')).toBeInTheDocument();
    });

    it('enrolls a new student', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            students: [],
                            course_assignments: []
                        }
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({
                    data: {
                        users: [
                            { id: 11, username: 'student2', nickname: 'Jane Doe', role: 'student' }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '11' } });

        client.post.mockResolvedValueOnce({
            data: { success: true, message: 'Enrolled' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Enroll/i }));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/classrooms/cls123/enroll', { student_id: 11 });
        });
        expect(toast.success).toHaveBeenCalledWith('Enrolled');
    });

    it('unenrolls a student', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            students: [
                                { id: 10, username: 'student1', nickname: 'John Doe', is_online: true }
                            ],
                            course_assignments: []
                        }
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({
                    data: {
                        users: [
                            { id: 10, username: 'student1', nickname: 'John Doe', role: 'student' }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        client.post.mockResolvedValueOnce({
            data: { success: true, message: 'Unenrolled' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Remove/i }));

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/classrooms/cls123/unenroll', { student_id: 10 });
        });
        expect(toast.success).toHaveBeenCalledWith('Unenrolled');

        confirmSpy.mockRestore();
    });

    it('updates classroom settings', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            language: 'Python',
                            url: 'http://example.com',
                            course_id: '',
                            students: [],
                            course_assignments: []
                        }
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Python Level 1')).toBeInTheDocument();
        });

        const nameInput = screen.getByDisplayValue('Python Level 1');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        client.put.mockResolvedValueOnce({
            data: { success: true, message: 'Updated' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

        await waitFor(() => {
            expect(client.put).toHaveBeenCalledWith('/api/admin/classrooms/cls123', expect.objectContaining({
                name: 'New Name',
                language: 'Python',
                url: 'http://example.com'
            }));
        });
        expect(toast.success).toHaveBeenCalledWith('Updated');
    });

    it('deletes the classroom when confirmed', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            students: [],
                            course_assignments: []
                        }
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        client.delete.mockResolvedValueOnce({
            data: { success: true, message: 'Deleted' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Delete Classroom/i }));

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(client.delete).toHaveBeenCalledWith('/api/admin/classrooms/cls123');
        });
        expect(toast.success).toHaveBeenCalledWith('Deleted');
        expect(mockNavigate).toHaveBeenCalledWith('/admin/classes');

        confirmSpy.mockRestore();
    });

    it('cancels classroom deletion when confirmation is rejected', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            students: [],
                            course_assignments: []
                        }
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [] } });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

        fireEvent.click(screen.getByRole('button', { name: /Delete Classroom/i }));

        expect(confirmSpy).toHaveBeenCalled();
        expect(client.delete).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
    });

    const setupInitialMocks = () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/classrooms/cls123')) {
                return Promise.resolve({
                    data: {
                        classroom: {
                            id: 'cls123',
                            name: 'Python Level 1',
                            language: 'Python',
                            course_id: 'course-py',
                            url: 'http://example.com',
                            students: [
                                { id: 10, username: 'student1', nickname: 'John Doe', is_online: true }
                            ],
                            course_assignments: [
                                { id: 'inst1', course_id: 'course-py', created_at: '2026-07-24T10:00:00Z' }
                            ]
                        }
                    }
                });
            }
            if (url.includes('/api/admin/crud/course')) {
                return Promise.resolve({
                    data: {
                        data: [
                            { id: 'course-py', name: 'Python Basics' },
                            { id: 'course-js', name: 'JS Basics' }
                        ]
                    }
                });
            }
            if (url.includes('/api/course-requests/pending')) {
                return Promise.resolve({
                    data: {
                        requests: [
                            { 
                                id: 5, 
                                student_username: 'student1', 
                                course_instance_id: 'inst-pending', 
                                requested_course_id: 'course-js', 
                                student_classrooms: [{ id: 'cls123', name: 'Python Level 1' }] 
                            }
                        ]
                    }
                });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [] } });
            }
            return Promise.resolve({ data: {} });
        });
    };

    it('renders course instances and pending requests', async () => {
        setupInitialMocks();
        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        // Check course assignment list displays the instance
        expect(screen.getByText('inst1')).toBeInTheDocument();
        expect(screen.getByText('Python Basics')).toBeInTheDocument();

        // Check pending requests card displays the pending request
        expect(screen.getByText('Pending Student Requests')).toBeInTheDocument();
        expect(screen.getByText('inst-pending')).toBeInTheDocument();
        expect(screen.getByText('JS Basics')).toBeInTheDocument();
    });

    it('creates a course instance via modal', async () => {
        setupInitialMocks();
        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        // Click "+" button to add course instance
        const addButton = screen.getByTitle('Add Course Instance');
        fireEvent.click(addButton);

        // Verify modal opened
        expect(screen.getByText('Create Course Instance')).toBeInTheDocument();

        // Fill form
        const instanceIdInput = screen.getByLabelText(/Instance ID/i);
        fireEvent.change(instanceIdInput, { target: { value: 'new-inst-123' } });

        const courseSelect = screen.getByLabelText(/^Course$/i);
        fireEvent.change(courseSelect, { target: { value: 'course-js' } });

        client.post.mockResolvedValueOnce({ data: { success: true } });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /Save Instance/i }));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/crud/courseinstance', {
                id: 'new-inst-123',
                classroom_id: 'cls123',
                course_id: 'course-js'
            });
        });
        expect(toast.success).toHaveBeenCalledWith('Course Instance created successfully.');
    });

    it('edits an existing course instance', async () => {
        setupInitialMocks();
        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('inst1')).toBeInTheDocument();
        });

        // Click edit button on the assignment
        const editButtons = screen.getAllByTitle('Edit Instance');
        fireEvent.click(editButtons[0]);

        // Verify edit modal opened
        expect(screen.getByText('Edit Course Instance')).toBeInTheDocument();
        expect(screen.getByLabelText(/Instance ID/i)).toBeDisabled();

        // Change course
        const courseSelect = screen.getByLabelText(/^Course$/i);
        fireEvent.change(courseSelect, { target: { value: 'course-js' } });

        client.put.mockResolvedValueOnce({ data: { success: true } });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /Save Instance/i }));

        await waitFor(() => {
            expect(client.put).toHaveBeenCalledWith('/api/admin/crud/courseinstance/inst1', {
                id: 'inst1',
                classroom_id: 'cls123',
                course_id: 'course-js'
            });
        });
        expect(toast.success).toHaveBeenCalledWith('Course Instance updated successfully.');
    });

    it('deletes a course instance', async () => {
        setupInitialMocks();
        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('inst1')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
        client.delete.mockResolvedValueOnce({ data: { success: true } });

        // Click delete button
        const deleteButtons = screen.getAllByTitle('Delete Instance');
        fireEvent.click(deleteButtons[0]);

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(client.delete).toHaveBeenCalledWith('/api/admin/crud/courseinstance/inst1');
        });
        expect(toast.success).toHaveBeenCalledWith('Course Instance deleted.');
        confirmSpy.mockRestore();
    });

    it('approves a pending request', async () => {
        setupInitialMocks();
        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('inst-pending')).toBeInTheDocument();
        });

        // Click approve button
        const approveButton = screen.getByTitle('Approve Request');
        fireEvent.click(approveButton);

        // Verify modal opened
        expect(screen.getByText('Approve Course Instance')).toBeInTheDocument();

        client.post.mockResolvedValueOnce({ data: { success: true } });

        // Click Save Instance
        fireEvent.click(screen.getByRole('button', { name: /Save Instance/i }));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/course-requests/5/approve', {
                classroom_id: 'cls123',
                course_id: 'course-js'
            });
        });
        expect(toast.success).toHaveBeenCalledWith('Course Instance Request approved.');
    });

    it('rejects a pending request', async () => {
        setupInitialMocks();
        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('inst-pending')).toBeInTheDocument();
        });

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
        client.post.mockResolvedValueOnce({ data: { success: true } });

        // Click reject button
        const rejectButton = screen.getByTitle('Reject Request');
        fireEvent.click(rejectButton);

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/course-requests/5/reject');
        });
        expect(toast.success).toHaveBeenCalledWith('Request rejected.');
        confirmSpy.mockRestore();
    });
});
