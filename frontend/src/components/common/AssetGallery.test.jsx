import { render, screen, within, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import AssetGallery from './AssetGallery';

const stored = (id, kind, path, size = 100) => {
    const name = path.split('/').pop();
    return {
        id, kind, path, name, size,
        url: `/user/project_files/${id}/${name}`,
        download_url: `/user/project_files/${id}/${name}?download=1`,
    };
};
const asset = (id, path, size) => stored(id, 'asset', path, size);

describe('AssetGallery', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('with nothing to show', () => {
        it.each([
            ['no files', []],
            ['undefined files', undefined],
            ['only source and model files', [stored(1, 'source', 'main.py'), stored(2, 'model', 'robot.stl')]],
        ])('renders nothing for %s', (_label, files) => {
            const { container } = render(<AssetGallery files={files} />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('images', () => {
        const files = [asset(2, 'images/b.jpg'), asset(1, 'images/a.png'), asset(3, 'IMG_0007.WEBP')];

        it('shows each image as a thumbnail with its file name as alt text, in path order', () => {
            render(<AssetGallery files={files} />);

            const pictures = screen.getAllByRole('img');
            expect(pictures.map((picture) => picture.getAttribute('alt'))).toEqual(['a.png', 'b.jpg', 'IMG_0007.WEBP']);
            expect(pictures[0]).toHaveAttribute('src', '/user/project_files/1/a.png');
            expect(pictures[0]).toHaveAttribute('loading', 'lazy');
        });

        it('makes each thumbnail a link that opens the full image in a new tab', () => {
            render(<AssetGallery files={files} />);

            const link = screen.getByRole('link', { name: 'a.png' });
            expect(link).toHaveAttribute('href', '/user/project_files/1/a.png');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noreferrer');
            expect(link).toHaveAttribute('title', 'Open a.png in a new tab');
        });

        it('lays the thumbnails out in a list so assistive technology can count them', () => {
            render(<AssetGallery files={files} />);

            const grid = screen.getAllByRole('list')[0];
            expect(within(grid).getAllByRole('listitem')).toHaveLength(3);
        });

        it('uses absolute URLs when the API is on another origin', () => {
            vi.stubEnv('VITE_API_URL', 'https://api.example.com');
            render(<AssetGallery files={[asset(1, 'a.png')]} />);

            expect(screen.getByRole('img')).toHaveAttribute('src', 'https://api.example.com/user/project_files/1/a.png');
            expect(screen.getByRole('link')).toHaveAttribute('href', 'https://api.example.com/user/project_files/1/a.png');
        });

        it('leaves the file name in place of a picture that fails to load', () => {
            render(<AssetGallery files={[asset(1, 'a.png'), asset(2, 'b.png')]} />);

            fireEvent.error(screen.getByAltText('a.png'));

            expect(screen.queryByAltText('a.png')).not.toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'a.png' })).toHaveAttribute('href', '/user/project_files/1/a.png');
            expect(screen.getByAltText('b.png')).toBeInTheDocument();
        });
    });

    describe('sounds', () => {
        const files = [asset(1, 'sfx/jump.wav'), asset(2, 'music/theme.MP3')];

        it('gives each sound a player and its name', () => {
            const { container } = render(<AssetGallery files={files} />);

            const players = container.querySelectorAll('audio');
            expect(players).toHaveLength(2);
            const theme = screen.getByLabelText('theme.MP3');
            expect(theme.tagName).toBe('AUDIO');
            expect(theme).toHaveAttribute('controls');
            expect(theme).toHaveAttribute('src', '/user/project_files/2/theme.MP3');
            expect(screen.getByText('jump.wav')).toBeInTheDocument();
        });

        it('does not download any sound until it is played', () => {
            const { container } = render(<AssetGallery files={files} />);

            container.querySelectorAll('audio').forEach((player) => {
                expect(player).toHaveAttribute('preload', 'none');
            });
        });

        it('is not a link and has no thumbnail', () => {
            render(<AssetGallery files={files} />);

            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });
    });

    describe('documents and other files', () => {
        it('offers a PDF as a download link with its size', () => {
            render(<AssetGallery files={[asset(1, 'docs/plan.pdf', 1536)]} />);

            const link = screen.getByRole('link', { name: /plan\.pdf/ });
            expect(link).toHaveAttribute('href', '/user/project_files/1/plan.pdf?download=1');
            expect(link).toHaveAttribute('download', 'plan.pdf');
            expect(link).not.toHaveAttribute('target');
            expect(link).toHaveTextContent('1.5 KB');
        });

        it('treats an asset with an unfamiliar extension the same way', () => {
            render(<AssetGallery files={[asset(1, 'data.bin', 3 * 1024 * 1024)]} />);

            const link = screen.getByRole('link', { name: /data\.bin/ });
            expect(link).toHaveAttribute('href', '/user/project_files/1/data.bin?download=1');
            expect(link).toHaveTextContent('3 MB');
        });
    });

    describe('a mixed set', () => {
        const files = [
            stored(9, 'source', 'main.py'),
            stored(8, 'model', 'robot.stl'),
            asset(1, 'cover.png'),
            asset(2, 'theme.ogg'),
            asset(3, 'notes.pdf', 2048),
        ];

        it('shows images, then sounds, then downloads, and ignores the other kinds', () => {
            const { container } = render(<AssetGallery files={files} />);

            const sections = screen.getByRole('region', { name: 'Project assets' });
            const order = [...sections.querySelectorAll('img, audio, a.asset-gallery-file')].map((node) => node.tagName);
            expect(order).toEqual(['IMG', 'AUDIO', 'A']);
            expect(container).not.toHaveTextContent('main.py');
            expect(container).not.toHaveTextContent('robot.stl');
        });
    });
});
