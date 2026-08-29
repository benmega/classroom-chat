import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminClassDashboard from './AdminClassDashboard';
import client from '../../api/client';
// eslint-disable-next-line
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

// The Stream tab embeds the full Chat experience; stub it out for unit tests.
vi.mock('../Chat/Chat', () => ({
    default: () => <div data-testid="mock-chat" />
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

    const mockClassroomApi = (classroom, users = []) => {
        client.get.mockImplementation((url) => {
            if (url.includes('/join-code')) {
                return Promise.resolve({ data: {} });
            }
            if (url.includes('/api/admin/classrooms/')) {
                return Promise.resolve({ data: { classroom } });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users } });
            }
            return Promise.resolve({ data: {} });
        });
    };

    it('renders loading state initially', () => {
        client.get.mockImplementation(() => new Promise(() => {})); // Never resolves
        renderWithRouter(<AdminClassDashboard />);
        expect(screen.getAllByTestId("skeleton-title")[0]).toBeInTheDocument();
    });

    it('fetches and displays classroom details and students', async () => {
        mockClassroomApi(
            {
                id: 'cls123',
                name: 'Python Level 1',
                language: 'Python',
                course_id: 'py1',
                url: 'http://example.com',
                students: [
                    { id: 10, username: 'student1', nickname: 'John Doe', is_online: true }
                ],
                course_assignments: []
            },
            [
                { id: 10, username: 'student1', nickname: 'John Doe', role: 'student' },
                { id: 11, username: 'student2', nickname: 'Jane Doe', role: 'student' }
            ]
        );

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        // Known languages render as an icon with the language as alt text
        expect(screen.getByAltText('Python')).toBeInTheDocument();

        // The roster lives in the People tab
        fireEvent.click(screen.getByRole('tab', { name: 'People' }));
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('@student1')).toBeInTheDocument();
    });

    it('enrolls a new student', async () => {
        mockClassroomApi(
            {
                id: 'cls123',
                name: 'Python Level 1',
                students: [],
                course_assignments: []
            },
            [
                { id: 11, username: 'student2', nickname: 'Jane Doe', role: 'student' }
            ]
        );

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'People' }));

        // Click the UserPlus button to open the modal
        fireEvent.click(screen.getByRole('button', { name: 'Enroll Student' }));

        const select = document.getElementById('student-select-list');
        fireEvent.change(select, { target: { value: '11' } });

        client.post.mockResolvedValueOnce({
            data: { success: true, message: 'Enrolled' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Invite/i }));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/classrooms/cls123/enroll', { student_id: 11 });
        });
        
    });

    it('unenrolls a student', async () => {
        mockClassroomApi(
            {
                id: 'cls123',
                name: 'Python Level 1',
                students: [
                    { id: 10, username: 'student1', nickname: 'John Doe', is_online: true }
                ],
                course_assignments: []
            },
            [
                { id: 10, username: 'student1', nickname: 'John Doe', role: 'student' }
            ]
        );

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'People' }));
        expect(screen.getByText('John Doe')).toBeInTheDocument();

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        client.post.mockResolvedValueOnce({
            data: { success: true, message: 'Unenrolled' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Remove/i }));

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/classrooms/cls123/unenroll', { student_id: 10 });
        });
        

        confirmSpy.mockRestore();
    });

    it.skip('updates classroom settings', async () => {
        mockClassroomApi({
            id: 'cls123',
            name: 'Python Level 1',
            language: 'python',
            url: 'http://example.com',
            course_id: '',
            students: [],
            course_assignments: []
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

        const nameInput = screen.getByDisplayValue('Python Level 1');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        client.put.mockResolvedValueOnce({
            data: { success: true, message: 'Updated' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

        await waitFor(() => {
            expect(client.put).toHaveBeenCalledWith('/api/admin/classrooms/cls123', expect.objectContaining({
                name: 'New Name',
                language: 'python'
            }));
        });
        
    });

    it.skip('deletes the classroom when confirmed', async () => {
        mockClassroomApi({
            id: 'cls123',
            name: 'Python Level 1',
            students: [],
            course_assignments: []
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

        client.delete.mockResolvedValueOnce({
            data: { success: true, message: 'Deleted' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Delete Classroom/i }));

        expect(confirmSpy).toHaveBeenCalled();
        await waitFor(() => {
            expect(client.delete).toHaveBeenCalledWith('/api/admin/classrooms/cls123');
        });
        
        expect(mockNavigate).toHaveBeenCalledWith('/admin/classes');

        confirmSpy.mockRestore();
    });

    it.skip('cancels classroom deletion when confirmation is rejected', async () => {
        mockClassroomApi({
            id: 'cls123',
            name: 'Python Level 1',
            students: [],
            course_assignments: []
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

        const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);

        fireEvent.click(screen.getByRole('button', { name: /Delete Classroom/i }));

        expect(confirmSpy).toHaveBeenCalled();
        expect(client.delete).not.toHaveBeenCalled();
        
        expect(mockNavigate).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
    });

    it('renders connected courses in the classwork tab', async () => {
        mockClassroomApi({
            id: 'cls123',
            name: 'Python Level 1',
            language: 'python',
            students: [],
            course_assignments: [
                { id: 'inst1', course_id: 'course-py', course_name: 'Python Basics' },
                { id: 'inst2', course_id: 'course-js' }
            ]
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Classwork' }));

        expect(screen.getByRole('button', { name: 'Add Connected Course' })).toBeInTheDocument();
        // Displays course_name when present, falling back to course_id
        expect(screen.getByText('Python Basics')).toBeInTheDocument();
        expect(screen.getByText('course-js')).toBeInTheDocument();
    });

    it('shows an empty state in the classwork tab when no courses are connected', async () => {
        mockClassroomApi({
            id: 'cls123',
            name: 'Python Level 1',
            students: [],
            course_assignments: []
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Classwork' }));

        expect(screen.getByText('No courses connected.')).toBeInTheDocument();
    });

    it('opens add course modal and connects a course in classwork tab', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/crud/courses')) {
                return Promise.resolve({ data: { data: [{ id: 'course-py', name: 'Python Basics' }] } });
            }
            if (url.includes('/join-code')) {
                return Promise.resolve({ data: { success: true, join_code: 'ABC123' } });
            }
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
            return Promise.reject(new Error('not found'));
        });

        client.post.mockResolvedValue({ data: { data: { id: 'inst1', classroom_id: 'cls123', course_id: 'course-py' } } });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Classwork' }));

        const addCourseBtn = screen.getByRole('button', { name: 'Add Connected Course' });
        fireEvent.click(addCourseBtn);

        expect(screen.getByText('Connect Course to Classroom')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Select Course'), { target: { value: 'course-py' } });
        fireEvent.change(screen.getByLabelText(/Instance ID/i), { target: { value: 'inst1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Connect Course' }));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/crud/courseinstances', expect.objectContaining({
                classroom_id: 'cls123',
                course_id: 'course-py'
            }));
            
        });
    });

    it('disconnects a course in classwork tab', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        mockClassroomApi({
            id: 'cls123',
            name: 'Python Level 1',
            students: [],
            course_assignments: [
                { id: 'inst1', course_id: 'course-py', course_name: 'Python Basics' }
            ]
        });
        client.delete.mockResolvedValue({ data: { data: { id: 'inst1' } } });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'Classwork' }));

        const removeBtn = screen.getByRole('button', { name: /disconnect course python basics/i });
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(client.delete).toHaveBeenCalledWith('/api/admin/crud/courseinstances/inst1');
            
        });

        confirmSpy.mockRestore();
    });

    it('displays the join code when the API provides one', async () => {
        client.get.mockImplementation((url) => {
            if (url.includes('/join-code')) {
                return Promise.resolve({ data: { success: true, join_code: 'ABC123' } });
            }
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

        expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('displays join code and allows regenerating join code in People tab', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        let currentJoinCode = 'OLD123';
        client.get.mockImplementation((url) => {
            if (url.includes('/join-code')) {
                return Promise.resolve({ data: { success: true, join_code: currentJoinCode } });
            }
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

        client.post.mockImplementation((url) => {
            if (url.includes('/regenerate_code')) {
                currentJoinCode = 'NEW456';
                return Promise.resolve({ data: { success: true, join_code: 'NEW456' } });
            }
            return Promise.resolve({ data: {} });
        });

        renderWithRouter(<AdminClassDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Python Level 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: 'People' }));

        // Open the modal containing join code & enroll
        fireEvent.click(screen.getByRole('button', { name: 'Enroll Student' }));

        expect(screen.getAllByText('OLD123').length).toBeGreaterThan(0);

        const regenerateBtn = screen.getByRole('button', { name: 'Regenerate Join Code' });
        fireEvent.click(regenerateBtn);

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/admin/classrooms/cls123/regenerate_code');
            expect(screen.getAllByText('NEW456').length).toBeGreaterThan(0);
            
        });

        confirmSpy.mockRestore();
    });
});
