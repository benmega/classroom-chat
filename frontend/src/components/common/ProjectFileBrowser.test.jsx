import { StrictMode } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../test/mocks/server';
import ProjectFileBrowser from './ProjectFileBrowser';

// CodeView has its own tests; here it only has to show which code, language and file it was given
vi.mock('./CodeView', () => ({
    default: ({ code, language, filename, maxHeight }) => (
        <pre data-testid="code-view" data-language={language ?? ''} data-filename={filename} data-max-height={maxHeight ?? ''}>
            {code}
        </pre>
    ),
}));

const stored = (id, path, size = 100, kind = 'source') => {
    const name = path.split('/').pop();
    return {
        id, kind, path, name, size,
        content_type: 'text/plain; charset=utf-8',
        url: `/user/project_files/${id}/${name}`,
        download_url: `/user/project_files/${id}/${name}?download=1`,
    };
};

const FILES = [
    stored(3, 'src/util/helpers.js', 90),
    stored(1, 'main.py', 1200),
    stored(5, 'notes.txt', 0),
    stored(6, 'robot.stl', 684, 'model'),
    stored(2, 'src/game.py', 3400),
    stored(7, 'cover.png', 5000, 'asset'),
    stored(4, 'README.md', 12),
];

const TEXTS = {
    1: 'print("main")',
    2: 'print("game")',
    3: 'export const helper = 1;',
    4: '# Read me',
    5: '',
};

// Answers the file route with TEXTS[id] and records which ids were asked for, in order
const serveFiles = (texts = TEXTS) => {
    const requested = [];
    server.use(
        http.get('*/user/project_files/:id/:name', ({ params }) => {
            requested.push(Number(params.id));
            const text = texts[params.id];
            return text === undefined
                ? new HttpResponse('Not found', { status: 404 })
                : HttpResponse.text(text);
        })
    );
    return requested;
};

const shownCode = () => screen.findByTestId('code-view');
const fileButton = (name) => screen.getByRole('button', { name });

beforeEach(() => {
    serveFiles();
});

describe('ProjectFileBrowser', () => {
    describe('with nothing to show', () => {
        it.each([
            ['no files', []],
            ['undefined files', undefined],
            ['only a model and an asset', [stored(6, 'robot.stl', 684, 'model'), stored(7, 'cover.png', 5000, 'asset')]],
        ])('renders nothing for %s', (_label, files) => {
            const { container } = render(<ProjectFileBrowser files={files} />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('the tree', () => {
        it('lists only the source files, folders before files, each in natural order', async () => {
            render(<ProjectFileBrowser files={FILES} />);
            await shownCode();

            const tree = screen.getByRole('group', { name: 'Source files' });
            const names = within(tree).getAllByRole('button').map((button) => button.textContent);
            expect(names).toEqual(['src', 'util', 'helpers.js', 'game.py', 'main.py', 'notes.txt', 'README.md']);
            expect(screen.queryByRole('button', { name: 'robot.stl' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'cover.png' })).not.toBeInTheDocument();
        });

        it('nests a file inside the folders of its path', async () => {
            render(<ProjectFileBrowser files={FILES} />);
            await shownCode();

            const src = fileButton('src').closest('li');
            expect(within(src).getByRole('button', { name: 'game.py' })).toBeInTheDocument();
            const util = within(src).getByRole('button', { name: 'util' }).closest('li');
            expect(within(util).getByRole('button', { name: 'helpers.js' })).toBeInTheDocument();
            expect(within(util).queryByRole('button', { name: 'game.py' })).not.toBeInTheDocument();
        });

        it('shares one folder between files that start with the same folder', async () => {
            const files = [stored(1, 'lib/a.py'), stored(2, 'lib/b.py'), stored(3, 'lib/sub/c.py')];
            serveFiles({ 1: 'a', 2: 'b', 3: 'c' });
            render(<ProjectFileBrowser files={files} />);
            await shownCode();

            expect(screen.getAllByRole('button', { name: 'lib' })).toHaveLength(1);
        });

        it('shows a file object that has a name but no path at the top of the tree', async () => {
            const { path: _path, ...withoutPath } = stored(1, 'main.py');
            render(<ProjectFileBrowser files={[withoutPath]} />);
            await shownCode();

            expect(fileButton('main.py')).toHaveAttribute('title', 'main.py');
            expect(screen.getByTestId('code-view').closest('.project-files-viewer')).toHaveTextContent('main.py');
        });

        it('collapses and expands a folder', async () => {
            const user = userEvent.setup();
            render(<ProjectFileBrowser files={FILES} />);
            await shownCode();
            const src = fileButton('src');

            expect(src).toHaveAttribute('aria-expanded', 'true');

            await user.click(src);
            expect(src).toHaveAttribute('aria-expanded', 'false');
            expect(screen.queryByRole('button', { name: 'game.py' })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'helpers.js' })).not.toBeInTheDocument();
            expect(fileButton('main.py')).toBeInTheDocument();

            await user.click(src);
            expect(src).toHaveAttribute('aria-expanded', 'true');
            expect(fileButton('game.py')).toBeInTheDocument();
        });

        it('keeps a nested folder shut when only the outer one is reopened', async () => {
            const user = userEvent.setup();
            render(<ProjectFileBrowser files={FILES} />);
            await shownCode();

            await user.click(fileButton('util'));
            await user.click(fileButton('src'));
            await user.click(fileButton('src'));

            expect(fileButton('util')).toHaveAttribute('aria-expanded', 'false');
            expect(screen.queryByRole('button', { name: 'helpers.js' })).not.toBeInTheDocument();
        });
    });
});

describe('ProjectFileBrowser selection', () => {
    const current = () => screen.getAllByRole('button').filter((button) => button.getAttribute('aria-current') === 'true');

    it('opens the first file by path', async () => {
        render(<ProjectFileBrowser files={FILES} />);

        const code = await shownCode();
        expect(code).toHaveTextContent('print("main")');
        expect(code).toHaveAttribute('data-filename', 'main.py');
        expect(current()).toEqual([fileButton('main.py')]);
    });

    it('opens initialFileId instead when it is a source file', async () => {
        render(<ProjectFileBrowser files={FILES} initialFileId={3} />);

        expect(await shownCode()).toHaveTextContent('export const helper = 1;');
        expect(current()).toEqual([fileButton('helpers.js')]);
    });

    it.each([
        ['an id that is not in the project', 999],
        ['the id of a model file', 6],
        ['no id', undefined],
    ])('opens the first file for %s', async (_label, initialFileId) => {
        render(<ProjectFileBrowser files={FILES} initialFileId={initialFileId} />);

        expect(await shownCode()).toHaveTextContent('print("main")');
        expect(current()).toEqual([fileButton('main.py')]);
    });

    it('opens the file that is clicked and moves the marker to it', async () => {
        const user = userEvent.setup();
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        await user.click(fileButton('game.py'));

        await waitFor(() => expect(screen.getByTestId('code-view')).toHaveTextContent('print("game")'));
        expect(screen.getByTestId('code-view')).toHaveAttribute('data-filename', 'game.py');
        expect(current()).toEqual([fileButton('game.py')]);
    });

    it('can be driven from the keyboard', async () => {
        const user = userEvent.setup();
        serveFiles({ 1: 'one', 2: 'two' });
        render(<ProjectFileBrowser files={[stored(1, 'a.py'), stored(2, 'b.py')]} />);
        await shownCode();

        await user.tab();
        expect(fileButton('a.py')).toHaveFocus();
        await user.tab();
        expect(fileButton('b.py')).toHaveFocus();
        await user.keyboard('{Enter}');

        await waitFor(() => expect(screen.getByTestId('code-view')).toHaveTextContent('two'));
        expect(current()).toEqual([fileButton('b.py')]);
    });

    it('falls back to the first file when the open one is no longer in the project', async () => {
        const { rerender } = render(<ProjectFileBrowser files={FILES} initialFileId={3} />);
        expect(await shownCode()).toHaveTextContent('export const helper = 1;');

        rerender(<ProjectFileBrowser files={FILES.filter((file) => file.id !== 3)} initialFileId={3} />);

        await waitFor(() => expect(screen.getByTestId('code-view')).toHaveTextContent('print("main")'));
        expect(current()).toEqual([fileButton('main.py')]);
    });

    it.each([
        ['helpers.js', 'javascript'],
        ['README.md', 'markdown'],
        ['main.py', 'python'],
        ['notes.txt', 'plaintext'],
        ['player.gd', ''],
        ['Makefile', ''],
    ])('hands %s to CodeView as language %j', async (name, language) => {
        const files = [stored(1, name)];
        serveFiles({ 1: 'some text' });
        render(<ProjectFileBrowser files={files} />);

        expect(await shownCode()).toHaveAttribute('data-language', language);
    });
});

describe('ProjectFileBrowser file text', () => {
    // A request the test releases by hand, so a loading state can be looked at
    const gated = () => {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        return { gate, release };
    };

    it('shows a loading status until the text arrives', async () => {
        const { gate, release } = gated();
        server.use(http.get('*/user/project_files/:id/:name', async () => {
            await gate;
            return HttpResponse.text('print("late")');
        }));
        render(<ProjectFileBrowser files={FILES} />);

        expect(screen.getByRole('status')).toHaveTextContent('Loading main.py...');
        expect(screen.queryByTestId('code-view')).not.toBeInTheDocument();

        release();
        expect(await shownCode()).toHaveTextContent('print("late")');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('asks the server for each file once, however often it is shown', async () => {
        const user = userEvent.setup();
        const requested = serveFiles();
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        await user.click(fileButton('game.py'));
        await waitFor(() => expect(screen.getByTestId('code-view')).toHaveTextContent('print("game")'));
        await user.click(fileButton('main.py'));
        expect(screen.getByTestId('code-view')).toHaveTextContent('print("main")');
        await user.click(fileButton('game.py'));
        expect(screen.getByTestId('code-view')).toHaveTextContent('print("game")');
        await user.click(fileButton('main.py'));

        expect(requested).toEqual([1, 2]);
    });

    it('still asks once in StrictMode, which runs effects twice in development', async () => {
        const requested = serveFiles();
        render(<StrictMode><ProjectFileBrowser files={FILES} /></StrictMode>);

        expect(await shownCode()).toHaveTextContent('print("main")');
        expect(requested).toEqual([1]);
    });

    it('does not start a second request while the first is still on its way', async () => {
        const user = userEvent.setup();
        const { gate, release } = gated();
        const requested = [];
        server.use(http.get('*/user/project_files/:id/:name', async ({ params }) => {
            requested.push(Number(params.id));
            await gate;
            return HttpResponse.text(`text of ${params.id}`);
        }));
        render(<ProjectFileBrowser files={FILES} />);

        await user.click(fileButton('game.py'));
        await user.click(fileButton('main.py'));
        await user.click(fileButton('game.py'));
        release();

        await waitFor(() => expect(screen.getByTestId('code-view')).toHaveTextContent('text of 2'));
        expect(requested.filter((id) => id === 2)).toHaveLength(1);
        expect(requested.filter((id) => id === 1)).toHaveLength(1);
    });

    it('keeps a .json file as text instead of parsing it', async () => {
        serveFiles({ 1: '{"lives": 3}' });
        render(<ProjectFileBrowser files={[stored(1, 'config.json')]} />);

        expect(await shownCode()).toHaveTextContent('{"lives": 3}');
        expect(screen.getByTestId('code-view')).toHaveAttribute('data-language', 'json');
    });

    it('says so when a file is empty, instead of showing an empty code box', async () => {
        const user = userEvent.setup();
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        await user.click(fileButton('notes.txt'));

        expect(await screen.findByText('This file is empty.')).toBeInTheDocument();
        expect(screen.queryByTestId('code-view')).not.toBeInTheDocument();
    });
});

describe('ProjectFileBrowser header', () => {
    it('names the open file by its path and gives its size', async () => {
        const user = userEvent.setup();
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        const viewer = screen.getByTestId('code-view').closest('.project-files-viewer');
        expect(within(viewer).getByText('main.py')).toBeInTheDocument();
        expect(within(viewer).getByText('1.2 KB')).toBeInTheDocument();

        await user.click(fileButton('helpers.js'));
        await waitFor(() => expect(within(viewer).getByText('src/util/helpers.js')).toBeInTheDocument());
        expect(within(viewer).getByText('90 B')).toBeInTheDocument();
    });

    it('links to the download of the open file', async () => {
        const user = userEvent.setup();
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        const link = screen.getByRole('link', { name: 'Download main.py' });
        expect(link).toHaveAttribute('href', '/user/project_files/1/main.py?download=1');
        expect(link).toHaveAttribute('download', 'main.py');

        await user.click(fileButton('game.py'));
        await waitFor(() => expect(screen.getByRole('link', { name: 'Download game.py' })).toHaveAttribute(
            'href', '/user/project_files/2/game.py?download=1'
        ));
        expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('offers the download while the text is still loading and after it failed', async () => {
        server.use(http.get('*/user/project_files/:id/:name', () => new HttpResponse('Nope', { status: 500 })));
        render(<ProjectFileBrowser files={FILES} />);

        expect(screen.getByRole('link', { name: 'Download main.py' })).toBeInTheDocument();
        await screen.findByRole('alert');
        expect(screen.getByRole('link', { name: 'Download main.py' })).toBeInTheDocument();
    });
});

describe('ProjectFileBrowser when a file cannot be loaded', () => {
    it('says which file failed and offers a retry that loads it', async () => {
        const user = userEvent.setup();
        let failNext = true;
        const requested = [];
        server.use(http.get('*/user/project_files/:id/:name', ({ params }) => {
            requested.push(Number(params.id));
            if (failNext) return new HttpResponse('Server error', { status: 500 });
            return HttpResponse.text(TEXTS[params.id]);
        }));
        render(<ProjectFileBrowser files={FILES} />);

        const alert = await screen.findByRole('alert');
        expect(alert).toHaveTextContent('Could not load main.py.');
        expect(screen.queryByTestId('code-view')).not.toBeInTheDocument();
        expect(requested).toEqual([1]);

        failNext = false;
        await user.click(within(alert).getByRole('button', { name: 'Retry' }));

        expect(await shownCode()).toHaveTextContent('print("main")');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(requested).toEqual([1, 1]);
    });

    it('stays on the error when the retry fails too, and lets the user try again', async () => {
        const user = userEvent.setup();
        let attempts = 0;
        server.use(http.get('*/user/project_files/:id/:name', () => {
            attempts += 1;
            return attempts < 3 ? new HttpResponse('Server error', { status: 500 }) : HttpResponse.text('finally');
        }));
        render(<ProjectFileBrowser files={FILES} />);

        await screen.findByRole('alert');
        await user.click(screen.getByRole('button', { name: 'Retry' }));
        await waitFor(() => expect(attempts).toBe(2));
        expect(await screen.findByRole('alert')).toHaveTextContent('Could not load main.py.');

        await user.click(screen.getByRole('button', { name: 'Retry' }));
        expect(await shownCode()).toHaveTextContent('finally');
    });

    it('treats a dropped connection like any other failure', async () => {
        server.use(http.get('*/user/project_files/:id/:name', () => HttpResponse.error()));
        render(<ProjectFileBrowser files={FILES} />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Could not load main.py.');
    });

    it('fails one file without touching the others', async () => {
        const user = userEvent.setup();
        server.use(http.get('*/user/project_files/:id/:name', ({ params }) => (
            params.id === '2' ? new HttpResponse('Gone', { status: 404 }) : HttpResponse.text(TEXTS[params.id])
        )));
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        await user.click(fileButton('game.py'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Could not load game.py.');

        await user.click(fileButton('main.py'));
        expect(screen.getByTestId('code-view')).toHaveTextContent('print("main")');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});

describe('ProjectFileBrowser props', () => {
    it('adds className to its root', async () => {
        render(<ProjectFileBrowser files={FILES} className="in-modal" />);
        await shownCode();

        expect(screen.getByRole('region', { name: 'Project source files' })).toHaveClass('project-files', 'in-modal');
    });

    it('has no stray class without a className', async () => {
        render(<ProjectFileBrowser files={FILES} />);
        await shownCode();

        expect(screen.getByRole('region', { name: 'Project source files' }).className).toBe('project-files');
    });

    it('limits the code and the tree to maxHeight', async () => {
        render(<ProjectFileBrowser files={FILES} maxHeight="15rem" />);

        expect(await shownCode()).toHaveAttribute('data-max-height', '15rem');
        expect(screen.getByRole('region', { name: 'Project source files' }).style.getPropertyValue('--project-files-max-height')).toBe('15rem');
    });

    it('limits the height by default too', async () => {
        render(<ProjectFileBrowser files={FILES} />);

        expect(await shownCode()).toHaveAttribute('data-max-height', '28rem');
    });
});
