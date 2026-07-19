import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CourseProgress from './CourseProgress';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('CourseProgress', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null if no total levels completed', () => {
        const target = { course_progress: null, cc_levels: 0, oz_levels: 0 };
        const { container } = render(<CourseProgress target={target} />, { wrapper: MemoryRouter });
        expect(container.firstChild).toBeNull();
    });

    it('renders courses correctly and navigates to tree', () => {
        const target = {
            slug: 'student1',
            cc_levels: 10,
            oz_levels: 5,
            course_progress: {
                codecombat: {
                    breakdown: [
                        { course_name: 'CS1', levels_completed: 5, levels_total: 10 },
                        { course_name: 'CS2', levels_completed: 10, levels_total: 10 }
                    ]
                },
                ozaria: {
                    breakdown: [
                        { course_name: 'Ozaria 1', course_id: 'ozaria-1', levels_completed: 2, levels_total: 5 }
                    ]
                }
            }
        };

        render(<CourseProgress target={target} />, { wrapper: MemoryRouter });

        expect(screen.getByText('Course Progress')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument(); // total levels

        expect(screen.getByText('CS1')).toBeInTheDocument();
        expect(screen.getByText('Ozaria 1')).toBeInTheDocument();
        expect(screen.getByText('CS2')).toBeInTheDocument(); // completed course added

        // Navigate via header
        const header = screen.getByTitle('View Detailed Tree');
        fireEvent.click(header);
        expect(mockNavigate).toHaveBeenCalledWith('/course-progress/student1', { state: { target, highlightCourseName: null } });

        // Navigate via specific course
        const cs1 = screen.getByText('CS1').closest('.progress-item');
        fireEvent.click(cs1);
        expect(mockNavigate).toHaveBeenCalledWith('/course-progress/student1', { state: { target, highlightCourseName: 'CS1' } });
    });

    it('handles parent view navigation', () => {
        const target = {
            slug: 'student1',
            cc_levels: 5,
            oz_levels: 0,
            course_progress: {
                codecombat: {
                    breakdown: [
                        { course_name: 'CS1', levels_completed: 5, levels_total: 10 }
                    ]
                }
            }
        };

        render(<CourseProgress target={target} isParentView={true} studentId="123" />, { wrapper: MemoryRouter });

        const header = screen.getByTitle('View Detailed Tree');
        fireEvent.click(header);
        expect(mockNavigate).toHaveBeenCalledWith('/parent/course-progress/123', { state: { target, highlightCourseName: null } });
    });

    it('renders text when no courses started', () => {
        const target = {
            slug: 'student1',
            cc_levels: 1, // manually set total > 0 so it doesn't return null
            oz_levels: 0,
            course_progress: {
                codecombat: { breakdown: [] },
                ozaria: { breakdown: [] }
            }
        };

        render(<CourseProgress target={target} />, { wrapper: MemoryRouter });

        expect(screen.getByText('No courses started yet.')).toBeInTheDocument();
    });
});
