import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import CourseProgressTree from './CourseProgressTree';
import useAuthStore from '../../store/useAuthStore';

const mockLocation = {
  pathname: '/',
  state: null
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
    useNavigate: () => vi.fn(),
  };
});

describe('CourseProgressTree - Chapter Recommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockLocation.state = null;
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('suggests the first chapter (Code Combat Junior) when no progress is made', async () => {
    mockLocation.state = {
      course_progress: {
        codecombat: { breakdown: [] },
        ozaria: { breakdown: [] }
      }
    };

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const ccJuniorCell = screen.getAllByTestId("skill-node-cell")[0];
      expect(ccJuniorCell).toHaveClass('recommended');
      expect(screen.getByText('Code Combat Junior')).toBeInTheDocument();
    });
  });

  it('suggests Computer Science 5 when Computer Science 4 is fully completed', async () => {
    mockLocation.state = {
      course_progress: {
        codecombat: {
          breakdown: [
            { course_name: 'Computer Science 4', levels_completed: 10, levels_total: 10 },
            { course_name: 'Introduction to Computer Science', levels_completed: 5, levels_total: 5 },
            { course_name: 'Computer Science 2', levels_completed: 5, levels_total: 5 },
            { course_name: 'Computer Science 3', levels_completed: 5, levels_total: 5 },
            { course_name: 'Code Combat Junior', levels_completed: 5, levels_total: 5 },
          ]
        },
        ozaria: { breakdown: [] }
      }
    };

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const cells = screen.getAllByTestId("skill-node-cell");
      let cs5Cell = null;
      cells.forEach(cell => {
        const h3 = cell.querySelector('h3');
        if (h3 && h3.textContent === 'Computer Science 5') {
          cs5Cell = cell;
        }
      });
      expect(cs5Cell).not.toBeNull();
      expect(cs5Cell).toHaveClass('recommended');
    });
  });

  it('suggests Web Development 2 when Web Development 1 is completed', async () => {
    mockLocation.state = {
      course_progress: {
        codecombat: {
          breakdown: [
            { course_name: 'Web Development 1', levels_completed: 8, levels_total: 8 },
          ]
        },
        ozaria: { breakdown: [] }
      }
    };

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const cells = screen.getAllByTestId("skill-node-cell");
      let wd2Cell = null;
      cells.forEach(cell => {
        const h3 = cell.querySelector('h3');
        if (h3 && h3.textContent === 'Web Development 2') {
          wd2Cell = cell;
        }
      });
      expect(wd2Cell).not.toBeNull();
      expect(wd2Cell).toHaveClass('recommended');
    });
  });

  it('suggests Computer Science 5 when Ozaria Chapter 4 (Ozaria Column) is completed', async () => {
    mockLocation.state = {
      course_progress: {
        codecombat: { breakdown: [] },
        ozaria: {
          breakdown: [
            { course_name: 'Sky Mountain', levels_completed: 5, levels_total: 5 },
            { course_name: 'Ozaria Chapter 2', levels_completed: 5, levels_total: 5 },
            { course_name: 'Ozaria Chapter 3', levels_completed: 5, levels_total: 5 },
            { course_name: 'Ozaria 4', levels_completed: 5, levels_total: 5 },
          ]
        }
      }
    };

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const cells = screen.getAllByTestId("skill-node-cell");
      let cs5Cell = null;
      cells.forEach(cell => {
        const h3 = cell.querySelector('h3');
        if (h3 && h3.textContent === 'Computer Science 5') {
          cs5Cell = cell;
        }
      });
      expect(cs5Cell).not.toBeNull();
      expect(cs5Cell).toHaveClass('recommended');
    });
  });

  it('suggests the farthest down incomplete chapter when the very bottom chapter (Computer Science 6) is completed', async () => {
    mockLocation.state = {
      course_progress: {
        codecombat: {
          breakdown: [
            { course_name: 'Computer Science 6', levels_completed: 10, levels_total: 10 },
            { course_name: 'Computer Science 5', levels_completed: 10, levels_total: 10 },
          ]
        },
        ozaria: {
          breakdown: [
            { course_name: 'Sky Mountain', levels_completed: 5, levels_total: 5 },
            { course_name: 'Ozaria Chapter 2', levels_completed: 5, levels_total: 5 },
            { course_name: 'Ozaria Chapter 3', levels_completed: 5, levels_total: 5 },
          ]
        }
      }
    };

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const cells = screen.getAllByTestId("skill-node-cell").filter(n => n.classList.contains("recommended"));
      expect(cells.length).toBe(1);
      const text = cells[0].textContent;
      expect(text.includes('Ozaria 4') || text.includes('Game Development 3')).toBe(true);
    });
  });
});

describe('CourseProgressTree - Claim Ducks and History FABs Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/';
    mockLocation.state = {
      course_progress: {
        codecombat: { breakdown: [] },
        ozaria: { breakdown: [] }
      }
    };
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('renders Claim Ducks button and History FAB when viewed by a student on /course-progress/:slug', async () => {
    mockLocation.pathname = '/course-progress/student-1';
    useAuthStore.setState({ user: { id: 10, role: 'student', username: 'student1' }, isAuthenticated: true });

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /claim ducks/i })).toBeInTheDocument();
      expect(screen.getByTitle('View History')).toBeInTheDocument();
    });
  });

  it('does NOT render Claim Ducks button and History FAB when on a parent route such as /parent/course-progress/9', async () => {
    mockLocation.pathname = '/parent/course-progress/9';

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /claim ducks/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle('View History')).not.toBeInTheDocument();
    });
  });

  it('does NOT render Claim Ducks button and History FAB when logged in as parent', async () => {
    mockLocation.pathname = '/course-progress/student-1';
    useAuthStore.setState({ user: { id: 20, role: 'parent', username: 'parent1' }, isAuthenticated: true });

    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /claim ducks/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle('View History')).not.toBeInTheDocument();
    });
  });
});

