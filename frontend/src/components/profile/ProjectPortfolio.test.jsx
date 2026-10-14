import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProjectPortfolio from './ProjectPortfolio';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('ProjectPortfolio', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null if no projects', () => {
        const { container } = render(<ProjectPortfolio projects={[]} isOwner={false} setSelectedProject={vi.fn()} />, { wrapper: MemoryRouter });
        expect(container.firstChild).toBeNull();
    });

    it('renders projects and handles interactions', () => {
        const mockSetSelectedProject = vi.fn();
        const mockProjects = [
            {
                id: 1,
                name: 'Project 1',
                description: 'Description 1',
                image_url: '/img1.png',
                video_url: 'http://video',
                teacher_comment: 'Good job',
                status: 'approved',
                link: 'http://link1'
            },
            {
                id: 2,
                name: 'Project 2',
                description: 'Description 2',
                image_url: '/img2.png',
                video_url: null,
                teacher_comment: null,
                status: 'pending',
                link: null
            }
        ];

        render(<ProjectPortfolio projects={mockProjects} isOwner={true} setSelectedProject={mockSetSelectedProject} studentId="123" />, { wrapper: MemoryRouter });

        expect(screen.getByText('Projects Portfolio')).toBeInTheDocument();
        
        // Add Project link
        const addLink = screen.getByTitle('Add Project');
        expect(addLink).toHaveAttribute('href', '/project/new?student_id=123');

        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.getByText('Project 2')).toBeInTheDocument();

        // Only the pending project gets the in-progress badge
        expect(screen.getAllByText('In Progress')).toHaveLength(1);
        expect(screen.getByText('Project 2').closest('.project-card')).toHaveTextContent('In Progress');

        // Details click
        const detailsBtns = screen.getAllByText('Details');
        fireEvent.click(detailsBtns[0]); // Project 2, since sorted by id desc
        expect(mockSetSelectedProject).toHaveBeenCalledWith(mockProjects[1]);

        // Image thumb click
        const thumb2 = screen.getByText('Project 1').closest('.project-card').querySelector('.project-thumb');
        fireEvent.click(thumb2);
        expect(mockSetSelectedProject).toHaveBeenCalledWith(mockProjects[0]);

        // Edit click
        const editBtns = screen.getAllByTitle('Edit Project');
        fireEvent.click(editBtns[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/project/edit/2'); // top one is id:2
    });

    it('names the external-link icon after the project it opens', () => {
        const projects = [
            { id: 1, name: 'Platformer', image_url: '/a.png', link: 'https://example.com/platformer' },
            { id: 2, name: 'No Demo', image_url: '/b.png', link: null },
        ];
        render(<ProjectPortfolio projects={projects} isOwner={false} setSelectedProject={vi.fn()} />, { wrapper: MemoryRouter });

        const link = screen.getByRole('link', { name: 'Open Platformer link' });
        expect(link).toHaveAttribute('href', 'https://example.com/platformer');
        expect(screen.queryByRole('link', { name: /No Demo/ })).not.toBeInTheDocument();
    });

    it('shows the owner an empty portfolio with a link to add the first project', () => {
        render(<ProjectPortfolio projects={[]} isOwner={true} setSelectedProject={vi.fn()} />, { wrapper: MemoryRouter });

        expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
        expect(screen.getByTitle('Add Project')).toHaveAttribute('href', '/project/new');
    });

    it('treats a missing projects list as an empty one', () => {
        const { container, unmount } = render(<ProjectPortfolio projects={undefined} isOwner={false} setSelectedProject={vi.fn()} />, { wrapper: MemoryRouter });
        expect(container.firstChild).toBeNull();
        unmount();

        render(<ProjectPortfolio projects={null} isOwner={true} setSelectedProject={vi.fn()} />, { wrapper: MemoryRouter });
        expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
    });

    it('opens a project from its thumbnail with Enter or Space and ignores other keys', () => {
        const setSelectedProject = vi.fn();
        const project = { id: 1, name: 'Platformer', image_url: '/a.png' };
        render(<ProjectPortfolio projects={[project]} isOwner={false} setSelectedProject={setSelectedProject} />, { wrapper: MemoryRouter });
        const thumb = screen.getByTestId('project-thumb');

        fireEvent.keyDown(thumb, { key: 'a' });
        expect(setSelectedProject).not.toHaveBeenCalled();

        fireEvent.keyDown(thumb, { key: 'Enter' });
        fireEvent.keyDown(thumb, { key: ' ' });
        expect(setSelectedProject).toHaveBeenCalledTimes(2);
        expect(setSelectedProject).toHaveBeenCalledWith(project);
    });

    describe('card text', () => {
        const renderOne = (project) => render(
            <ProjectPortfolio projects={[{ id: 1, name: 'P', image_url: '/i.png', ...project }]} isOwner={false} setSelectedProject={vi.fn()} />,
            { wrapper: MemoryRouter }
        );
        const card = () => screen.getByText('P').closest('.project-card');

        it('shows a short description in full, without an ellipsis', () => {
            renderOne({ description: 'Short and sweet' });
            expect(card().querySelector('.project-content p').textContent).toBe('Short and sweet');
        });

        it('truncates a long description to 80 characters plus an ellipsis', () => {
            renderOne({ description: 'x'.repeat(120) });
            expect(card().querySelector('.project-content p').textContent).toBe(`${'x'.repeat(80)}...`);
        });

        it('does not add an ellipsis to a description of exactly 80 characters', () => {
            renderOne({ description: 'y'.repeat(80) });
            expect(card().querySelector('.project-content p').textContent).toBe('y'.repeat(80));
        });

        it('renders no description paragraph when the description is missing or empty', () => {
            renderOne({ description: null });
            expect(card().querySelector('.project-content p')).toBeNull();
            expect(card()).not.toHaveTextContent('...');
        });

        it('renders no description paragraph for an empty string', () => {
            renderOne({ description: '' });
            expect(card().querySelector('.project-content p')).toBeNull();
        });

        it('truncates a long teacher comment the same way and leaves a short one alone', () => {
            renderOne({ description: 'd', status: 'approved', teacher_comment: 'c'.repeat(100) });
            expect(card().querySelector('.card-teacher-feedback').textContent).toContain(`${'c'.repeat(80)}...`);
            expect(card().querySelector('.card-teacher-feedback').textContent).not.toContain('c'.repeat(81));
        });

        it('shows a short teacher comment without an ellipsis', () => {
            renderOne({ description: 'd', status: 'approved', teacher_comment: 'Nice work' });
            const feedback = card().querySelector('.card-teacher-feedback');
            expect(feedback.textContent).toContain('Nice work');
            expect(feedback.textContent).not.toContain('...');
        });
    });

    describe('review status', () => {
        const renderOne = (project) => render(
            <ProjectPortfolio projects={[{ id: 1, name: 'P', image_url: '/i.png', ...project }]} isOwner={false} setSelectedProject={vi.fn()} />,
            { wrapper: MemoryRouter }
        );
        const card = () => screen.getByText('P').closest('.project-card');

        it('badges a pending project as in progress', () => {
            renderOne({ status: 'pending' });
            expect(screen.getByText('In Progress')).toBeInTheDocument();
        });

        it('shows no badge on an approved project, whether or not it has a comment', () => {
            const { unmount } = renderOne({ status: 'approved', teacher_comment: null });
            expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
            expect(screen.queryByText('Revision Requested')).not.toBeInTheDocument();
            unmount();

            renderOne({ status: 'approved', teacher_comment: 'Well done' });
            expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
            expect(screen.queryByText('Revision Requested')).not.toBeInTheDocument();
        });

        it('badges a rejected project as a revision request and shows the feedback in the revision style', () => {
            renderOne({ status: 'rejected', teacher_comment: 'Add comments to the loop' });
            expect(screen.getByText('Revision Requested')).toBeInTheDocument();
            expect(screen.queryByText('In Progress')).not.toBeInTheDocument();

            const feedback = card().querySelector('.card-teacher-feedback');
            expect(feedback).toHaveTextContent('Add comments to the loop');
            expect(feedback).toHaveClass('revision-feedback');
        });

        it('shows the note of an approved project in the plain positive style', () => {
            renderOne({ status: 'approved', teacher_comment: 'Well done' });
            const feedback = card().querySelector('.card-teacher-feedback');
            expect(feedback).toHaveTextContent('Well done');
            expect(feedback).not.toHaveClass('revision-feedback');
            expect(feedback).not.toHaveClass('pending-feedback');
        });

        it('does not present the old revision note of a resubmitted project as approval', () => {
            // A rejected project that was edited goes back to pending but keeps its comment
            renderOne({ status: 'pending', teacher_comment: 'Add comments to the loop' });
            expect(screen.getByText('In Progress')).toBeInTheDocument();

            const feedback = card().querySelector('.card-teacher-feedback');
            expect(feedback).toHaveTextContent('Add comments to the loop');
            expect(feedback).toHaveClass('pending-feedback');
            expect(feedback).not.toHaveClass('revision-feedback');
        });
    });

    describe('file chips', () => {
        // A file entry as Project.to_dict() sends it.
        const projectFile = (id, kind, path) => {
            const name = path.split('/').pop();
            return { id, kind, name, path, size: 1200, url: `/user/project_files/${id}/${name}`, download_url: `/user/project_files/${id}/${name}?download=1` };
        };
        const model = projectFile(11, 'model', 'robot.stl');
        const sources = [projectFile(12, 'source', 'main.py'), projectFile(13, 'source', 'src/util.py'), projectFile(14, 'source', 'README.md')];
        const sprite = projectFile(15, 'asset', 'assets/sprite.png');

        const renderOne = (project, setSelectedProject = vi.fn()) => render(
            <ProjectPortfolio projects={[{ id: 1, name: 'P', image_url: '/i.png', ...project }]} isOwner={false} setSelectedProject={setSelectedProject} />,
            { wrapper: MemoryRouter }
        );
        const thumb = () => screen.getByTestId('project-thumb');
        const chips = () => Array.from(thumb().querySelectorAll('.project-file-chip')).map((chip) => chip.textContent.trim());

        it('marks a project with a model with a 3D chip and a rotate glyph instead of a play button', () => {
            renderOne({ files: [model] });

            expect(chips()).toEqual(['3D']);
            expect(within(thumb()).getByTitle('Has a 3D model')).toBeInTheDocument();
            expect(thumb().querySelector('.model-overlay')).toHaveAttribute('aria-hidden', 'true');
            expect(thumb().querySelector('.play-overlay')).toBeNull();
        });

        it('counts the source files on a chip, leaving assets out', () => {
            renderOne({ files: [...sources, sprite] });

            expect(chips()).toEqual(['3 files']);
            expect(within(thumb()).getByTitle('3 source files')).toBeInTheDocument();
            expect(thumb().querySelector('.model-overlay')).toBeNull();
        });

        it('says file, not files, for a single source file', () => {
            renderOne({ files: [sources[0]] });

            expect(chips()).toEqual(['1 file']);
            expect(within(thumb()).getByTitle('1 source file')).toBeInTheDocument();
        });

        it('shows both chips for a project with a model and source files', () => {
            renderOne({ files: [model, ...sources] });

            expect(chips()).toEqual(['3D', '3 files']);
        });

        it('shows no chips and no rotate glyph without models or source files', () => {
            const { unmount } = renderOne({ files: [sprite] });
            expect(thumb().querySelector('.project-file-chips')).toBeNull();
            expect(thumb().querySelector('.model-overlay')).toBeNull();
            unmount();

            // Projects from before files existed carry no list at all
            renderOne({});
            expect(thumb().querySelector('.project-file-chips')).toBeNull();
            expect(thumb().querySelector('.model-overlay')).toBeNull();
        });

        it('keeps the play button for a model project that has a video', () => {
            renderOne({ files: [model], video_url: 'https://cdn.example.com/robot.mp4' });

            expect(thumb().querySelector('.play-overlay')).toBeInTheDocument();
            expect(thumb().querySelector('.model-overlay')).toBeNull();
            expect(chips()).toEqual(['3D']);
        });

        it('keeps the review badge beside the chips', () => {
            renderOne({ status: 'pending', files: [model] });

            expect(within(thumb()).getByText('In Progress')).toBeInTheDocument();
            expect(chips()).toEqual(['3D']);
        });

        it('opens the project when a chip on its thumbnail is clicked', () => {
            const setSelectedProject = vi.fn();
            renderOne({ files: [model, ...sources] }, setSelectedProject);

            fireEvent.click(screen.getByText('3 files'));

            expect(setSelectedProject).toHaveBeenCalledWith(expect.objectContaining({ id: 1, files: [model, ...sources] }));
        });
    });
});
