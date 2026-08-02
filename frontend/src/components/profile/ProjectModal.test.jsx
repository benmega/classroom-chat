import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectModal from './ProjectModal';

describe('ProjectModal Component', () => {
  const mockOnClose = vi.fn();
  const mockProject = {
    name: 'Awesome Game Project',
    description: 'A 2D platformer game built with JavaScript.',
    link: 'https://awesomegame.com',
    github_link: 'https://github.com/test/game',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    image_url: '/uploads/game.png',
    code_snippet: 'console.log("Hello World");',
    teacher_comment: 'Great effort on controls!',
  };

  it('returns null if project is null', () => {
    const { container } = render(<ProjectModal project={null} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders project details, links, video embed, description, and teacher comment', () => {
    render(<ProjectModal project={mockProject} onClose={mockOnClose} />);

    expect(screen.getByText('Awesome Game Project')).toBeInTheDocument();
    expect(screen.getByText('A 2D platformer game built with JavaScript.')).toBeInTheDocument();
    expect(screen.getByText('console.log("Hello World");')).toBeInTheDocument();
    expect(screen.getByText(/"Great effort on controls!"/i)).toBeInTheDocument();

    const launchBtn = screen.getByRole('link', { name: /Launch Live/i });
    expect(launchBtn).toHaveAttribute('href', 'https://awesomegame.com');

    const sourceBtn = screen.getByRole('link', { name: /Source/i });
    expect(sourceBtn).toHaveAttribute('href', 'https://github.com/test/game');

    const iframe = screen.getByTitle('Project Video Presentation');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0');
  });

  it('renders direct video player for non-YouTube/Vimeo video URL', () => {
    const directVideoProject = {
      ...mockProject,
      video_url: 'https://mycdn.com/video.mp4',
    };
    render(<ProjectModal project={directVideoProject} onClose={mockOnClose} />);

    const videoEl = document.querySelector('video');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('src', 'https://mycdn.com/video.mp4');
  });

  it('renders SmartImage fallback when video_url is absent', () => {
    const noVideoProject = {
      ...mockProject,
      video_url: null,
    };
    render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);

    const img = screen.getByAltText('Awesome Game Project');
    expect(img).toBeInTheDocument();
  });

  it('calls onClose when close button or overlay is clicked', () => {
    render(<ProjectModal project={mockProject} onClose={mockOnClose} />);

    const closeBtn = screen.getByRole('button', { name: '' }); // X icon button
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const overlay = document.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });
});
