import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import CourseProgressTree from './CourseProgressTree';
import useAuthStore from '../../store/useAuthStore';

const mockLocation = {
  pathname: '/',
  state: null
};
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
    useNavigate: () => mockNavigate,
  };
});

// The tree always loads project templates; default to "none" so unrelated tests stay quiet.
beforeEach(() => {
  server.use(http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates: {} } })));
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

const makeNodeFinder = () => (title) =>
  screen.getAllByTestId('skill-node-cell').find(cell => cell.querySelector('h3')?.textContent === title);

const threeDProgress = {
  codecombat: { breakdown: [] },
  ozaria: { breakdown: [] },
  '3d-modeling': {
    levels_completed: 1,
    percent: 20,
    breakdown: [
      {
        course_id: 'tc1',
        course_name: 'TinkerCAD 1',
        levels_completed: 1,
        levels_total: 3,
        levels: [
          { name: 'Name Plate', slug: 'name-plate', sequence: 1, is_completed: true },
          { name: 'Robot Buddy', slug: 'robot-buddy', sequence: 2, is_completed: false },
          { name: 'Castle', slug: 'castle', sequence: 3, is_completed: false },
        ],
      },
    ],
  },
};

describe('CourseProgressTree - 3D Modeling track', () => {
  const findNode = makeNodeFinder();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.pathname = '/course-progress/student-1';
    mockLocation.state = {
      course_progress: threeDProgress,
      target: { id: 10, active_track: '3d', course_progress: threeDProgress },
    };
    useAuthStore.setState({ user: { id: 10, role: 'student', username: 'student1' }, isAuthenticated: true });
    server.use(http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates: {} } })));
  });

  it('renders the active TinkerCAD node with its level count and 3D styling class', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const cell = findNode('TinkerCAD 1');
      expect(cell).toBeDefined();
      expect(cell).toHaveClass('active');
      expect(cell).not.toHaveClass('locked');
      expect(within(cell).getByText('1/3 levels')).toBeInTheDocument();
      const card = cell.querySelector('.skill-card');
      expect(card).toHaveClass('modeling3d');
      expect(card.className).not.toMatch(/3d-modeling/);
      expect(cell.querySelector('.skill-card-bg-fill')).toHaveClass('modeling3d');
    });
  });

  it('renders decorative node logos with empty alt text and no inline size override', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const logo = findNode('TinkerCAD 1').querySelector('img.domain-logo');
      expect(logo).toHaveAttribute('alt', '');
      expect(logo.getAttribute('src')).toMatch(/tinkercad/i);
      expect(logo).not.toHaveAttribute('style');
      expect(findNode('Blender 1').querySelector('img.domain-logo').getAttribute('src')).toMatch(/blender/i);
    });
  });

  it('shows the 3D header with one clearly named external link per tool', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /3D Modeling/ })).toBeInTheDocument();
    });
    const tinker = screen.getByRole('link', { name: 'Open Tinkercad (opens in new tab)' });
    const blender = screen.getByRole('link', { name: 'Open Blender (opens in new tab)' });
    expect(tinker).toHaveAttribute('href', 'https://www.tinkercad.com');
    expect(tinker).toHaveAttribute('target', '_blank');
    expect(tinker).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(blender).toHaveAttribute('href', 'https://www.blender.org');
    // The 3D header itself must not be a link (no nested anchors)
    expect(screen.getByRole('heading', { name: /3D Modeling/ }).closest('a')).toBeNull();
  });

  it('marks the other external track headers as opening in a new tab and fixes the Ozaria url', async () => {
    renderWithProviders(<CourseProgressTree />);

    const ozaria = await screen.findByRole('link', { name: /Ozaria.*opens in new tab/ });
    expect(ozaria).toHaveAttribute('href', 'https://www.ozaria.com');
    const cc = screen.getAllByRole('link', { name: /Computer Science.*opens in new tab/ })[0];
    expect(cc).toHaveAttribute('href', 'https://codecombat.com');
  });

  it('adds a track label to each node card for the mobile layout', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(within(findNode('TinkerCAD 1')).getByText('3D Modeling')).toHaveClass('node-track-label');
      expect(within(findNode('Blender 1')).getByText('3D Modeling')).toHaveClass('node-track-label');
      expect(within(findNode('Computer Science 2')).getByText('Computer Science')).toBeInTheDocument();
    });
  });

  it('shows "Projects coming soon" only on the 3D node without any levels', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(within(findNode('Blender 1')).getByText('Projects coming soon')).toBeInTheDocument();
      expect(within(findNode('TinkerCAD 1')).queryByText('Projects coming soon')).not.toBeInTheDocument();
      expect(within(findNode('Computer Science 2')).queryByText('Projects coming soon')).not.toBeInTheDocument();
    });
  });

  it('hides Claim Ducks (and keeps History) for a student whose active track is 3d', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      expect(screen.getByTitle('View History')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /claim ducks/i })).not.toBeInTheDocument();
  });

  it('still shows Claim Ducks for students on other tracks', async () => {
    mockLocation.state = {
      course_progress: threeDProgress,
      target: { id: 10, active_track: 'cs', course_progress: threeDProgress },
    };
    renderWithProviders(<CourseProgressTree />);

    expect(await screen.findByRole('button', { name: /claim ducks/i })).toBeInTheDocument();
  });

  it('renders Box project buttons labelled by project name, with a completed state', async () => {
    server.use(http.get('*/api/project-templates', () => HttpResponse.json({
      data: {
        templates: {
          a: { id: 1, name: 'Name Plate', chapter: 'TinkerCAD 1' },
          b: { id: 2, name: 'Robot Buddy', chapter: 'TinkerCAD 1' },
          c: { id: 3, name: 'Some CodeCombat Project', chapter: 'Computer Science 2' },
        },
      },
    })));
    renderWithProviders(<CourseProgressTree />);

    const done = await screen.findByRole('button', { name: 'Name Plate (completed)' });
    expect(done).toHaveClass('completed');
    const pending = screen.getByRole('button', { name: 'Robot Buddy' });
    expect(pending).not.toHaveClass('completed');
    expect(pending.querySelector('svg.lucide-box')).not.toBeNull();
    // Non-3D chapters keep the code icon
    const codeProject = screen.getByRole('button', { name: 'Some CodeCombat Project' });
    expect(codeProject.querySelector('svg.lucide-code')).not.toBeNull();
    // 3D nodes with projects no longer show the coming-soon hint
    expect(within(findNode('TinkerCAD 1')).queryByText('Projects coming soon')).not.toBeInTheDocument();

    fireEvent.click(pending);
    expect(mockNavigate).toHaveBeenCalledWith('/project-info/2', {
      state: { project: expect.objectContaining({ id: 2, name: 'Robot Buddy' }) },
    });
  });

  it('lists 3D project buttons in course level order, not API order', async () => {
    server.use(http.get('*/api/project-templates', () => HttpResponse.json({
      data: {
        templates: {
          a: { id: 3, name: 'Castle', chapter: 'TinkerCAD 1' },
          b: { id: 2, name: 'Robot Buddy', chapter: 'TinkerCAD 1' },
          c: { id: 1, name: 'Name Plate', chapter: 'TinkerCAD 1' },
        },
      },
    })));
    renderWithProviders(<CourseProgressTree />);

    await screen.findByRole('button', { name: 'Castle' });
    const labels = [...findNode('TinkerCAD 1').querySelectorAll('.project-node-btn')]
      .map(btn => btn.getAttribute('aria-label'));
    expect(labels).toEqual(['Name Plate (completed)', 'Robot Buddy', 'Castle']);
  });

  it('does not crash without any 3d-modeling progress data and shows the locked prerequisite', async () => {
    mockLocation.state = {
      course_progress: { codecombat: { breakdown: [] }, ozaria: { breakdown: [] } },
    };
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => {
      const tinker = findNode('TinkerCAD 1');
      expect(tinker).toHaveClass('locked');
      expect(within(tinker).getByText('Required: Computer Science 2')).toBeInTheDocument();
      expect(findNode('Blender 1')).toHaveClass('locked');
      expect(within(findNode('Blender 1')).getByText('Required: TinkerCAD 1')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /3D Modeling/ })).toBeInTheDocument();
  });

  it('opens the breakdown with the 3D node (including its tool logo) when clicked', async () => {
    renderWithProviders(<CourseProgressTree />);

    await waitFor(() => expect(findNode('TinkerCAD 1')).toBeDefined());
    fireEvent.click(findNode('TinkerCAD 1'));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/course-progress/student-1/breakdown',
      { state: expect.objectContaining({ selectedNode: expect.objectContaining({ id: '3d-1', domain: '3d-modeling', toolName: 'Tinkercad' }) }) }
    );
  });
});
