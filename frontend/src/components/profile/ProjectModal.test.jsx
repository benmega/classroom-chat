import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const overlay = document.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  describe('dialog behaviour', () => {
    // No video: an iframe would try to load the embed URL.
    const noVideoProject = { ...mockProject, video_url: null };

    beforeEach(() => {
      mockOnClose.mockClear();
    });

    it('is a modal dialog named after the project', () => {
      render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog', { name: 'Awesome Game Project' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('keeps its content reachable by role instead of hiding it inside a button', () => {
      render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);

      expect(screen.getByRole('heading', { name: 'Awesome Game Project' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Description/ })).toBeInTheDocument();
      expect(document.querySelector('.modal-overlay')).toHaveAttribute('role', 'presentation');
    });

    it('does not close when the dialog itself is clicked', () => {
      render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('A 2D platformer game built with JavaScript.'));
      fireEvent.click(screen.getByRole('dialog'));

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('closes on Escape', async () => {
      const user = userEvent.setup();
      render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('moves focus into the dialog and keeps Tab inside it', async () => {
      const user = userEvent.setup();
      render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

      const dialog = screen.getByRole('dialog');
      for (let i = 0; i < 8; i += 1) {
        await user.tab();
        expect(dialog).toContainElement(document.activeElement);
      }
    });

    it('returns focus to the control that opened it', () => {
      const opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();

      const { rerender } = render(<ProjectModal project={noVideoProject} onClose={mockOnClose} />);
      expect(opener).not.toHaveFocus();

      rerender(<ProjectModal project={null} onClose={mockOnClose} />);

      expect(opener).toHaveFocus();
      opener.remove();
    });
  });
});
