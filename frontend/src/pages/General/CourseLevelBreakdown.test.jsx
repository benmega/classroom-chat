import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import CourseLevelBreakdown from './CourseLevelBreakdown';
import { ALIGNED_NODES } from '../../constants/courseProgress';

const mockLocation = { pathname: '/course-progress/student-1/breakdown', state: null };
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation,
    useNavigate: () => mockNavigate,
  };
});

const baseNode = (id) => ALIGNED_NODES.find(n => n.id === id);

const tinkercadNode = {
  ...baseNode('3d-1'),
  levels_completed: 1,
  levels_total: 3,
  has_started: true,
  levels: [
    { name: 'Name Plate', slug: 'name-plate', sequence: 1, is_completed: true },
    { name: 'Robot Buddy', slug: 'robot-buddy', sequence: 2, is_completed: false },
    { name: 'Castle', slug: 'castle', sequence: 3, is_completed: false },
  ],
};

const templates = {
  a: { id: 11, name: 'Name Plate', chapter: 'TinkerCAD 1' },
  b: { id: 12, name: 'Robot Buddy', chapter: 'TinkerCAD 1', challenge_slug: 'robot-buddy' },
  c: { id: 13, name: 'Blender Donut', chapter: 'Blender 1' },
};

const renderBreakdown = (selectedNode, pathname) => {
  mockLocation.pathname = pathname || '/course-progress/student-1/breakdown';
  mockLocation.state = { selectedNode, userObj: { id: 10, active_track: selectedNode.track } };
  return renderWithProviders(<CourseLevelBreakdown />);
};

describe('CourseLevelBreakdown - 3D Modeling node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates } })));
  });

  it('shows 3D branding and content, not the Ozaria/CodeCombat game flow', async () => {
    const { container } = renderBreakdown(tinkercadNode);

    expect(screen.getByRole('heading', { level: 1, name: 'TinkerCAD 1' })).toBeInTheDocument();
    expect(screen.getByText('3D Modeling')).toBeInTheDocument(); // track name
    expect(screen.getByAltText('Tinkercad')).toHaveAttribute('src', expect.stringMatching(/tinkercad/i));
    expect(container.querySelector('img[src*="ozaria"]')).toBeNull();
    expect(container.querySelector('a[href*="ozaria"]')).toBeNull();
    expect(container.querySelector('a[href*="codecombat"]')).toBeNull();
    expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    expect(container.querySelector('.breakdown-header-card')).toHaveClass('border-modeling3d');

    ['3D Printing Basics', 'Shapes & Alignment', 'Holes (Subtraction)', 'Grouping', 'Measuring in mm', 'Revolve']
      .forEach(concept => expect(screen.getByText(concept)).toBeInTheDocument());
    expect(screen.queryByText('Logic Flow')).not.toBeInTheDocument();
  });

  it('uses the Blender concepts for Blender 1', async () => {
    renderBreakdown({ ...baseNode('3d-2'), levels_completed: 0, levels_total: 0, levels: [] });

    ['Navigation', 'Mesh Modeling', 'Modifiers', 'Materials', 'Keyframe Animation']
      .forEach(concept => expect(screen.getByText(concept)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Open Blender/ })).toHaveAttribute('href', 'https://www.blender.org');
  });

  it('offers the tool link (new tab) and explains the build-share-check flow', async () => {
    renderBreakdown(tinkercadNode);

    const link = screen.getByRole('link', { name: 'Open Tinkercad (opens in new tab)' });
    expect(link).toHaveAttribute('href', 'https://www.tinkercad.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByText(/Build it, share your link \+ screenshot, and your teacher will check it off/)).toBeInTheDocument();
  });

  it('pairs each level with its project: Start project for pending, View project for completed', async () => {
    renderBreakdown(tinkercadNode);

    const viewDone = await screen.findByRole('button', { name: 'View project: Name Plate' });
    expect(viewDone).toHaveTextContent('View project');
    const startNext = screen.getByRole('button', { name: 'Start project: Robot Buddy' });
    expect(startNext).toHaveTextContent('Start project');
    // Castle has no template yet, and Blender templates are not mixed in
    expect(screen.queryByRole('button', { name: /Castle/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Blender Donut/ })).not.toBeInTheDocument();

    fireEvent.click(startNext);
    expect(mockNavigate).toHaveBeenCalledWith('/project-info/12', {
      state: { project: expect.objectContaining({ id: 12 }) },
    });
  });

  it('puts a primary Start project button in the Next Project card for the next incomplete level', async () => {
    renderBreakdown(tinkercadNode);

    expect(screen.getByRole('heading', { name: 'Next Project' })).toBeInTheDocument();
    const cta = await screen.findByRole('button', { name: 'Start project' });
    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith('/project-info/12', expect.anything());
    // Done state for the completed level is still visible
    expect(screen.getAllByText('Done').length).toBe(1);
  });

  it('shows a coming-soon state when the course has no levels or projects', async () => {
    server.use(http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates: {} } })));
    renderBreakdown({ ...baseNode('3d-2'), levels_completed: 0, levels_total: null, levels: [] });

    await waitFor(() => {
      expect(screen.getAllByText('Projects coming soon').length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('button', { name: /Start project/ })).not.toBeInTheDocument();
  });

  it('hides project and tool actions for parents but keeps the progress view', async () => {
    renderBreakdown(tinkercadNode, '/parent/course-progress/student-1/breakdown');

    expect(screen.getByRole('heading', { level: 1, name: 'TinkerCAD 1' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Robot Buddy').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: /project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Open Tinkercad/ })).not.toBeInTheDocument();
  });

  it('lists a template that has no matching level so it can still be found', async () => {
    renderBreakdown({ ...tinkercadNode, levels: tinkercadNode.levels.filter(l => l.name !== 'Robot Buddy') });

    const row = (await screen.findByRole('button', { name: 'Start project: Robot Buddy' })).closest('.level-row-item');
    expect(within(row).getByText('Not started')).toBeInTheDocument();
    expect(within(row).queryByText('Pending')).not.toBeInTheDocument();
  });
});

describe('CourseLevelBreakdown - 3D per-project status and actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(http.get('*/api/project-templates', () => HttpResponse.json({ data: { templates } })));
  });

  const renderWithProjects = (projects, node = tinkercadNode) => {
    mockLocation.pathname = '/course-progress/student-1/breakdown';
    mockLocation.state = { selectedNode: node, userObj: { id: 10, active_track: '3d', projects } };
    return renderWithProviders(<CourseLevelBreakdown />);
  };

  const rowFor = async (label) => (await screen.findByRole('button', { name: label })).closest('.level-row-item');

  it('shows Not started and Start project when the student has no project', async () => {
    renderWithProjects([]);

    const row = await rowFor('Start project: Robot Buddy');
    expect(within(row).getByText('Not started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start project' })).toBeInTheDocument();
    expect(screen.queryByText('Continue project')).not.toBeInTheDocument();
  });

  it('shows submitted-waiting status and Continue project (edit page) for a submitted project', async () => {
    renderWithProjects([
      { id: 77, name: 'My Renamed Robot', template_id: 12, status: 'pending', link: 'https://tinkercad.com/things/x' },
    ]);

    const row = await rowFor('Continue project: Robot Buddy');
    expect(within(row).getByText('Submitted — waiting for teacher')).toBeInTheDocument();
    expect(within(row).queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start project' })).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Continue project: Robot Buddy' }));
    expect(mockNavigate).toHaveBeenCalledWith('/project/edit/77');

    // The Next Project card offers the same Continue action rather than a duplicate start.
    fireEvent.click(screen.getByRole('button', { name: 'Continue project' }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/project/edit/77');
  });

  it('shows In progress for a freshly assigned project with nothing submitted yet', async () => {
    renderWithProjects([{ id: 5, name: 'Robot Buddy', template_id: null, status: 'pending' }]);

    const row = await rowFor('Continue project: Robot Buddy');
    expect(within(row).getByText('In progress')).toBeInTheDocument();
  });

  it('shows Needs changes for a rejected project', async () => {
    renderWithProjects([{ id: 6, name: 'Robot Buddy', template_id: 12, status: 'rejected', link: 'x' }]);

    const row = await rowFor('Continue project: Robot Buddy');
    expect(within(row).getByText('Needs changes')).toBeInTheDocument();
  });

  it('matches by template_id, ignoring projects of other templates and same-name projects linked elsewhere', async () => {
    renderWithProjects([
      { id: 8, name: 'Robot Buddy', template_id: 13, status: 'pending', link: 'x' },
    ]);

    const row = await rowFor('Start project: Robot Buddy');
    expect(within(row).getByText('Not started')).toBeInTheDocument();
  });

  it('keeps Done + View project for a completed level', async () => {
    renderWithProjects([{ id: 9, name: 'Name Plate', template_id: 11, status: 'approved', link: 'x' }]);

    const row = await rowFor('View project: Name Plate');
    expect(within(row).getByText('Done')).toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'View project: Name Plate' }));
    expect(mockNavigate).toHaveBeenCalledWith('/project-info/11', expect.anything());
  });

  it('fetches the profile for projects when navigation state has none', async () => {
    let profileCalls = 0;
    server.use(http.get('*/user/profile/student-1', () => {
      profileCalls += 1;
      return HttpResponse.json({
        data: { target: { id: 10, projects: [{ id: 31, name: 'Whatever', template_id: 12, status: 'pending', link: 'x' }] } },
      });
    }));
    mockLocation.pathname = '/course-progress/student-1/breakdown';
    mockLocation.state = { selectedNode: tinkercadNode, userObj: { id: 10, active_track: '3d' } };
    renderWithProviders(
      <Routes><Route path="/course-progress/:slug/breakdown" element={<CourseLevelBreakdown />} /></Routes>,
      { route: '/course-progress/student-1/breakdown' }
    );

    const row = await rowFor('Continue project: Robot Buddy');
    expect(within(row).getByText('Submitted — waiting for teacher')).toBeInTheDocument();
    expect(profileCalls).toBe(1);
  });
});

describe('CourseLevelBreakdown - existing game domains keep their flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the Ozaria Continue link and logo for an Ozaria node', () => {
    const { container } = renderBreakdown({
      ...baseNode('oz-1'), levels_completed: 1, levels_total: 2,
      levels: [{ name: 'Intro', is_completed: true }, { name: 'Next', is_completed: false }],
    });

    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', 'https://ozaria.com/play');
    expect(container.querySelector('img[src*="ozaria"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /project/i })).not.toBeInTheDocument();
  });

  it('keeps the CodeCombat Continue link for a CodeCombat node', () => {
    renderBreakdown({
      ...baseNode('cs-1'), levels_completed: 0, levels_total: 1,
      levels: [{ name: 'Kithgard', is_completed: false }],
    });

    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', 'https://codecombat.com/play');
    expect(screen.getByText('Computer Science (CS)')).toBeInTheDocument();
  });
});
