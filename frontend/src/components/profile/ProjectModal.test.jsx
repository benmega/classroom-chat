// happy-dom loads the page of every iframe it renders, so each video embed here was a real request to
// youtube.com or vimeo.com. The tests only need the frame element, and with child frame navigation off
// happy-dom just records the URL (disableIframePageLoading logs an error per frame instead).
// @vitest-environment-options {"settings":{"navigation":{"disableChildFrameNavigation":true}}}
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectModal from './ProjectModal';
import { projectFileUrl } from '../../utils/projectFiles';

// The viewer, the file browser, the code view and the gallery are other modules with their own tests.
// These doubles show what the modal hands each of them.
vi.mock('../common/ModelViewer', () => ({
  default: ({ src, filename, downloadUrl, ariaLabel }) => (
    <div data-testid="model-viewer" role="img" aria-label={ariaLabel} data-src={src} data-filename={filename} data-download-url={downloadUrl} />
  ),
}));
vi.mock('../common/ProjectFileBrowser', () => ({
  default: ({ files }) => <div data-testid="file-browser" data-paths={files.map((file) => file.path).join(',')} />,
}));
vi.mock('../common/CodeView', () => ({
  default: ({ code, language }) => <pre data-testid="code-view" data-language={language ?? 'none'}>{code}</pre>,
}));
vi.mock('../common/AssetGallery', () => ({
  default: ({ files }) => <div data-testid="asset-gallery" data-paths={files.map((file) => file.path).join(',')} />,
}));
// Which extension maps to which highlighter is the projectFiles module's business; a fixed table keeps
// the snippet tests about the modal's choice.
vi.mock('../../utils/projectFiles', async (importOriginal) => ({
  ...(await importOriginal()),
  languageForFile: (name) => ({ py: 'python', js: 'javascript', md: 'markdown', json: 'json' })[name.split('.').pop()] ?? null,
}));

// A file entry as Project.to_dict() sends it.
const projectFile = (id, kind, path, extra = {}) => {
  const name = path.split('/').pop();
  return {
    id,
    kind,
    name,
    path,
    size: 1200,
    content_type: 'text/plain; charset=utf-8',
    url: `/user/project_files/${id}/${name}`,
    download_url: `/user/project_files/${id}/${name}?download=1`,
    created_at: '2026-10-14T05:00:00Z',
    ...extra,
  };
};

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
    status: 'approved',
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

  it('embeds a Vimeo link in the Vimeo player', () => {
    render(<ProjectModal project={{ ...mockProject, video_url: 'https://vimeo.com/76979871' }} onClose={mockOnClose} />);

    expect(screen.getByTitle('Project Video Presentation')).toHaveAttribute('src', 'https://player.vimeo.com/video/76979871');
  });

  it('plays a Vimeo link without a video id in the plain video player', () => {
    render(<ProjectModal project={{ ...mockProject, video_url: 'https://vimeo.com/channels/staffpicks' }} onClose={mockOnClose} />);

    expect(screen.queryByTitle('Project Video Presentation')).not.toBeInTheDocument();
    expect(document.querySelector('video')).toHaveAttribute('src', 'https://vimeo.com/channels/staffpicks');
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

    const overlay = document.querySelector('.profile-modal-overlay');
    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  describe('teacher feedback', () => {
    // No video: an iframe would try to load the embed URL.
    const noVideoProject = { ...mockProject, video_url: null };
    const feedback = () => document.querySelector('.teacher-feedback');

    it('shows the comment of an approved project as an instructor review in the positive style', () => {
      render(<ProjectModal project={{ ...noVideoProject, status: 'approved' }} onClose={mockOnClose} />);

      expect(feedback()).toHaveTextContent('Instructor Review');
      expect(feedback()).toHaveTextContent('Great effort on controls!');
      expect(feedback()).not.toHaveClass('revision-feedback');
      expect(feedback()).not.toHaveClass('pending-feedback');
    });

    it('shows the comment of a rejected project as a revision request in the revision style', () => {
      render(
        <ProjectModal
          project={{ ...noVideoProject, status: 'rejected', teacher_comment: 'Add comments to the loop' }}
          onClose={mockOnClose}
        />
      );

      expect(feedback()).toHaveTextContent('Revision Requested');
      expect(feedback()).toHaveTextContent('"Add comments to the loop"');
      expect(feedback()).toHaveClass('revision-feedback');
      expect(screen.queryByText(/Instructor Review/)).not.toBeInTheDocument();
    });

    it('does not present the note of a pending project as an instructor review or as a previous note', () => {
      // A pending project's note is either the old revision note of a resubmitted project or a
      // fresh note an admin wrote when adding it, so it must not claim to be either
      render(
        <ProjectModal
          project={{ ...noVideoProject, status: 'pending', teacher_comment: 'Add comments to the loop' }}
          onClose={mockOnClose}
        />
      );

      expect(feedback()).toHaveTextContent('Teacher Feedback');
      expect(feedback()).not.toHaveTextContent(/Previous/);
      expect(feedback()).toHaveTextContent('"Add comments to the loop"');
      expect(feedback()).toHaveClass('pending-feedback');
      expect(feedback()).not.toHaveClass('revision-feedback');
      expect(screen.queryByText(/Instructor Review/)).not.toBeInTheDocument();
    });

    it('shows no feedback block without a comment', () => {
      render(<ProjectModal project={{ ...noVideoProject, status: 'rejected', teacher_comment: null }} onClose={mockOnClose} />);

      expect(feedback()).toBeNull();
    });
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
      expect(document.querySelector('.profile-modal-overlay')).toHaveAttribute('role', 'presentation');
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

  // A project of the files era: no links, media or code unless a test adds them.
  const bareProject = {
    id: 7,
    name: 'Robot Arm',
    description: 'An arm with three joints.',
    link: null,
    github_link: null,
    video_url: null,
    image_url: null,
    code_snippet: null,
    teacher_comment: null,
    status: 'approved',
    project_type: 'code',
    files: [],
  };
  const model = projectFile(12, 'model', 'robot.stl', { size: 684, content_type: 'model/stl' });
  const mainPy = projectFile(13, 'source', 'src/main.py');
  const helpersPy = projectFile(14, 'source', 'src/helpers.py');
  const readme = projectFile(15, 'source', 'README.md');
  const sprite = projectFile(16, 'asset', 'assets/sprite.png', { content_type: 'image/png' });

  const renderProject = (overrides) => render(<ProjectModal project={{ ...bareProject, ...overrides }} onClose={mockOnClose} />);
  const tabNamed = (name) => screen.getByRole('tab', { name });

  describe('3D model', () => {
    it('fills the spotlight with the model viewer and offers no switcher when the model is the only medium', () => {
      renderProject({ project_type: '3d', files: [model] });

      const viewer = screen.getByRole('img', { name: '3D model of Robot Arm' });
      expect(viewer.parentElement).toHaveClass('video-spotlight');
      expect(viewer).toHaveAttribute('data-src', projectFileUrl(model));
      expect(viewer.dataset.src).toContain('/user/project_files/12/robot.stl');
      expect(viewer).toHaveAttribute('data-filename', 'robot.stl');
      expect(viewer).toHaveAttribute('data-download-url', projectFileUrl(model, { download: true }));
      expect(viewer.dataset.downloadUrl).toContain('/user/project_files/12/robot.stl?download=1');
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('offers the model for download beside the project links', () => {
      renderProject({ link: 'https://example.com/arm', github_link: 'https://github.com/test/arm', files: [model] });

      const download = screen.getByRole('link', { name: 'Download model' });
      expect(download).toHaveAttribute('href', projectFileUrl(model, { download: true }));
      expect(download).toHaveAttribute('download', 'robot.stl');
      const actions = download.closest('.profile-modal-actions');
      expect(within(actions).getByRole('link', { name: /Launch Live/ })).toBeInTheDocument();
      expect(within(actions).getByRole('link', { name: /Source/ })).toBeInTheDocument();
    });

    it('spotlights the first model when a project has several', () => {
      // First both in the list and by path, the order the API sends files in
      const second = projectFile(20, 'model', 'spare-parts.stl', { content_type: 'model/stl' });
      renderProject({ files: [model, second] });

      expect(screen.getByRole('img', { name: '3D model of Robot Arm' })).toHaveAttribute('data-filename', 'robot.stl');
      expect(screen.getAllByRole('link', { name: 'Download model' })).toHaveLength(1);
    });
  });

  describe('media switcher', () => {
    const allMedia = { video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', image_url: '/uploads/arm.png', files: [model] };

    it('offers the model, the video and the cover as tabs and starts on the model', () => {
      renderProject(allMedia);

      const tablist = screen.getByRole('tablist', { name: 'Project media' });
      expect(within(tablist).getAllByRole('tab').map((tab) => tab.textContent.trim())).toEqual(['3D Model', 'Video', 'Cover']);
      expect(tabNamed('3D Model')).toHaveAttribute('aria-selected', 'true');
      expect(tabNamed('Video')).toHaveAttribute('aria-selected', 'false');
      expect(screen.getByRole('tabpanel', { name: '3D Model' })).toContainElement(screen.getByRole('img', { name: '3D model of Robot Arm' }));
      expect(screen.queryByTitle('Project Video Presentation')).not.toBeInTheDocument();
    });

    it('shows the video and the cover when their tabs are clicked, and the model again after', async () => {
      const user = userEvent.setup();
      renderProject(allMedia);

      await user.click(tabNamed('Video'));
      expect(tabNamed('Video')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel', { name: 'Video' })).toContainElement(screen.getByTitle('Project Video Presentation'));
      expect(screen.getByTitle('Project Video Presentation')).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0');
      expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();

      await user.click(tabNamed('Cover'));
      expect(screen.getByRole('tabpanel', { name: 'Cover' })).toContainElement(screen.getByAltText('Robot Arm'));
      expect(screen.getByAltText('Robot Arm').getAttribute('src')).toContain('/uploads/arm.png');
      expect(screen.queryByTitle('Project Video Presentation')).not.toBeInTheDocument();

      await user.click(tabNamed('3D Model'));
      expect(screen.getByTestId('model-viewer')).toBeInTheDocument();
      expect(screen.queryByAltText('Robot Arm')).not.toBeInTheDocument();
    });

    it('moves along the tabs with the arrow keys, Home and End, keeping a single tab stop', async () => {
      const user = userEvent.setup();
      renderProject({ ...allMedia, video_url: 'https://cdn.example.com/arm.mp4' });
      const expectSelected = (name) => {
        expect(tabNamed(name)).toHaveAttribute('aria-selected', 'true');
        expect(tabNamed(name)).toHaveFocus();
        expect(screen.getAllByRole('tab').filter((tab) => tab.tabIndex === 0)).toEqual([tabNamed(name)]);
      };

      expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
      tabNamed('3D Model').focus();

      await user.keyboard('{ArrowRight}');
      expectSelected('Video');
      expect(document.querySelector('video')).toHaveAttribute('src', 'https://cdn.example.com/arm.mp4');
      await user.keyboard('{ArrowRight}');
      expectSelected('Cover');
      await user.keyboard('{ArrowRight}');
      expectSelected('3D Model');
      await user.keyboard('{ArrowLeft}');
      expectSelected('Cover');
      await user.keyboard('{Home}');
      expectSelected('3D Model');
      await user.keyboard('{End}');
      expectSelected('Cover');
      await user.keyboard('x');
      expectSelected('Cover');
    });

    it('offers the video and the cover when there is no model, starting on the video', () => {
      renderProject({ video_url: 'https://cdn.example.com/arm.mp4', image_url: '/uploads/arm.png' });

      expect(screen.getAllByRole('tab').map((tab) => tab.textContent.trim())).toEqual(['Video', 'Cover']);
      expect(tabNamed('Video')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel', { name: 'Video' }).querySelector('video').getAttribute('poster')).toContain('/uploads/arm.png');
    });

    it('starts the next project on its first medium, whatever the last one showed', async () => {
      const user = userEvent.setup();
      const { rerender } = renderProject(allMedia);
      await user.click(tabNamed('Cover'));

      rerender(<ProjectModal project={{ ...bareProject, ...allMedia, id: 8, name: 'Gripper' }} onClose={mockOnClose} />);

      expect(tabNamed('3D Model')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('img', { name: '3D model of Gripper' })).toBeInTheDocument();
    });
  });

  describe('project without files', () => {
    it('shows the cover alone, with no switcher, download, file browser or gallery', () => {
      render(<ProjectModal project={{ ...mockProject, video_url: null }} onClose={mockOnClose} />);

      expect(screen.getByAltText('Awesome Game Project').parentElement).toHaveClass('video-spotlight');
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Download model' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('file-browser')).not.toBeInTheDocument();
      expect(screen.queryByTestId('asset-gallery')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Assets/ })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog')).not.toHaveClass('has-source-files');
    });

    it('keeps the pasted snippet in the plain code box', () => {
      render(<ProjectModal project={{ ...mockProject, video_url: null }} onClose={mockOnClose} />);

      expect(document.querySelector('.modal-sidebar pre.code-snippet')).toHaveTextContent('console.log("Hello World");');
      expect(screen.queryByRole('heading', { name: 'Highlighted snippet' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('code-view')).not.toBeInTheDocument();
    });

    it('shows the placeholder picture when the project has no media at all', () => {
      renderProject({});

      expect(screen.getByAltText('Robot Arm')).toHaveAttribute('src', '/static/images/Project_placeholder.png');
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('says the source preview is not available for a coding project without code', () => {
      renderProject({});

      expect(document.querySelector('.no-code')).toHaveTextContent('Source code preview not available.');
    });

    it('says a 3D project without code is a 3D modelling project', () => {
      renderProject({ project_type: '3d', files: [model] });

      expect(document.querySelector('.no-code')).toHaveTextContent('This is a 3D modelling project.');
      expect(screen.queryByText(/Source code preview not available/)).not.toBeInTheDocument();
    });
  });

  describe('source files', () => {
    const sidebar = () => document.querySelector('.modal-sidebar');

    it('lists the files in the sidebar browser with the pasted snippet highlighted under it', () => {
      renderProject({ files: [mainPy, helpersPy, readme], code_snippet: 'print("hello")' });

      const browser = within(sidebar()).getByTestId('file-browser');
      expect(browser).toHaveAttribute('data-paths', 'src/main.py,src/helpers.py,README.md');
      const heading = within(sidebar()).getByRole('heading', { name: 'Highlighted snippet' });
      const snippet = within(sidebar()).getByTestId('code-view');
      expect(snippet).toHaveTextContent('print("hello")');
      expect(snippet).toHaveAttribute('data-language', 'python');
      // browser, then the heading, then the snippet
      expect(browser.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(heading.compareDocumentPosition(snippet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(sidebar().querySelector('pre.code-snippet')).toBeNull();
      expect(sidebar().querySelector('.no-code')).toBeNull();
    });

    it('widens the dialog for the browser', () => {
      renderProject({ files: [mainPy] });

      expect(screen.getByRole('dialog')).toHaveClass('project-modal', 'has-source-files');
    });

    it('shows the browser alone when there is no pasted snippet', () => {
      renderProject({ files: [mainPy] });

      expect(within(sidebar()).getByTestId('file-browser')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Highlighted snippet' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('code-view')).not.toBeInTheDocument();
    });

    it('highlights the snippet as the language most code files share, not counting data and docs', () => {
      const files = [
        projectFile(31, 'source', 'game.js'),
        projectFile(32, 'source', 'player.js'),
        projectFile(33, 'source', 'tools/build.py'),
        projectFile(34, 'source', 'levels/1.json'),
        projectFile(35, 'source', 'levels/2.json'),
        projectFile(36, 'source', 'levels/3.json'),
        readme,
      ];
      renderProject({ files, code_snippet: 'jump();' });

      expect(screen.getByTestId('code-view')).toHaveAttribute('data-language', 'javascript');
    });

    it('keeps the snippet plain when none of the files is code', () => {
      renderProject({ files: [readme, projectFile(34, 'source', 'levels/1.json'), projectFile(37, 'source', 'notes.txt')], code_snippet: 'jump();' });

      expect(screen.getByTestId('code-view')).toHaveAttribute('data-language', 'none');
    });

    it('shows the browser and the model together for a project with both', () => {
      renderProject({ project_type: '3d', files: [model, mainPy] });

      expect(screen.getByRole('img', { name: '3D model of Robot Arm' })).toBeInTheDocument();
      expect(within(sidebar()).getByTestId('file-browser')).toBeInTheDocument();
      expect(screen.queryByText('This is a 3D modelling project.')).not.toBeInTheDocument();
    });
  });

  describe('assets', () => {
    it('shows the asset gallery under the description', () => {
      renderProject({ files: [sprite] });

      const heading = screen.getByRole('heading', { name: /Assets/ });
      const gallery = screen.getByTestId('asset-gallery');
      expect(gallery).toHaveAttribute('data-paths', 'assets/sprite.png');
      expect(document.querySelector('.modal-main')).toContainElement(gallery);
      const description = screen.getByText('An arm with three joints.');
      expect(description.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(heading.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not widen the dialog or open a browser for assets alone', () => {
      renderProject({ files: [sprite] });

      expect(screen.getByRole('dialog')).not.toHaveClass('has-source-files');
      expect(screen.queryByTestId('file-browser')).not.toBeInTheDocument();
    });
  });
});
