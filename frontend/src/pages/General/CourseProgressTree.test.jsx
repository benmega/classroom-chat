import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import CourseProgressTree from './CourseProgressTree';

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
    mockLocation.state = null;
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
      const ccJuniorCell = document.querySelector('.skill-node-cell');
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
      const cells = document.querySelectorAll('.skill-node-cell');
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
      const cells = document.querySelectorAll('.skill-node-cell');
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

  it('suggests Computer Science 5 when Ozaria Chapter 4 (Ozeria Column) is completed', async () => {
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
      const cells = document.querySelectorAll('.skill-node-cell');
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
      const cells = document.querySelectorAll('.skill-node-cell.recommended');
      expect(cells.length).toBe(1);
      const text = cells[0].textContent;
      expect(text.includes('Ozaria 4') || text.includes('Game Development 3')).toBe(true);
    });
  });
});
