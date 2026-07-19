import { render, screen, fireEvent } from '@testing-library/react';
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
                link: 'http://link1'
            },
            {
                id: 2,
                name: 'Project 2',
                description: 'Description 2',
                image_url: '/img2.png',
                video_url: null,
                teacher_comment: null,
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

        // In progress badge
        expect(screen.getByText('In Progress')).toBeInTheDocument();

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
});
