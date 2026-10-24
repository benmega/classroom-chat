import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CodeView from './CodeView';
import { SOURCE_EXTENSIONS, languageForFile } from '../../utils/projectFiles';

// highlight.js is replaced so these tests can see when it is asked for, what for, and how often. The real
// library runs in CodeView.highlight.test.jsx. A CodeView keeps the loaded grammars for the whole page,
// so each test that needs a language nobody loaded yet takes one of its own.
const { hljs, grammar, luaLoad } = vi.hoisted(() => ({
    hljs: { highlight: vi.fn(), registerLanguage: vi.fn() },
    grammar: (id) => ({ default: { grammarFor: id } }),
    luaLoad: vi.fn(() => { throw new Error('chunk failed to load'); }),
}));

vi.mock('highlight.js/lib/core', () => ({ default: hljs }));
vi.mock('highlight.js/lib/languages/bash', () => grammar('bash'));
vi.mock('highlight.js/lib/languages/c', () => grammar('c'));
vi.mock('highlight.js/lib/languages/cpp', () => grammar('cpp'));
vi.mock('highlight.js/lib/languages/csharp', () => grammar('csharp'));
vi.mock('highlight.js/lib/languages/css', () => grammar('css'));
vi.mock('highlight.js/lib/languages/dos', () => grammar('dos'));
vi.mock('highlight.js/lib/languages/go', () => grammar('go'));
vi.mock('highlight.js/lib/languages/ini', () => grammar('ini'));
vi.mock('highlight.js/lib/languages/java', () => grammar('java'));
vi.mock('highlight.js/lib/languages/javascript', () => grammar('javascript'));
vi.mock('highlight.js/lib/languages/json', () => grammar('json'));
vi.mock('highlight.js/lib/languages/kotlin', () => grammar('kotlin'));
vi.mock('highlight.js/lib/languages/markdown', () => grammar('markdown'));
vi.mock('highlight.js/lib/languages/php', () => grammar('php'));
vi.mock('highlight.js/lib/languages/powershell', () => grammar('powershell'));
vi.mock('highlight.js/lib/languages/python', () => grammar('python'));
vi.mock('highlight.js/lib/languages/r', () => grammar('r'));
vi.mock('highlight.js/lib/languages/ruby', () => grammar('ruby'));
vi.mock('highlight.js/lib/languages/rust', () => grammar('rust'));
vi.mock('highlight.js/lib/languages/scss', () => grammar('scss'));
vi.mock('highlight.js/lib/languages/sql', () => grammar('sql'));
vi.mock('highlight.js/lib/languages/swift', () => grammar('swift'));
vi.mock('highlight.js/lib/languages/typescript', () => grammar('typescript'));
vi.mock('highlight.js/lib/languages/xml', () => grammar('xml'));
vi.mock('highlight.js/lib/languages/yaml', () => grammar('yaml'));
vi.mock('highlight.js/lib/languages/lua', luaLoad);

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fakeHighlight = (code, { language }) => ({
    value: `<span class="hljs-keyword" data-language="${language}">${escapeHtml(code)}</span>`,
});

const codeOf = (container) => container.querySelector('pre > code');
const gutterOf = (container) => container.querySelector('.code-view-gutter');
const registrationsOf = (id) => hljs.registerLanguage.mock.calls.filter(([language]) => language === id);

beforeEach(() => {
    hljs.highlight.mockReset().mockImplementation(fakeHighlight);
    hljs.registerLanguage.mockReset();
});

describe('CodeView markup', () => {
    it('shows the code as text in a pre and code element', () => {
        const { container } = render(<CodeView code={'print("hi")\nprint("bye")'} language={null} />);

        expect(container.querySelector('pre')).toBeInTheDocument();
        expect(codeOf(container)).toHaveTextContent('print("hi") print("bye")');
        expect(codeOf(container).textContent).toBe('print("hi")\nprint("bye")');
    });

    it('never reads the code as markup when it is shown plain', () => {
        const { container } = render(<CodeView code={'<img src=x onerror=alert(1)><script>alert(2)</script>'} />);

        expect(container.querySelector('img, script')).toBeNull();
        expect(codeOf(container).textContent).toBe('<img src=x onerror=alert(1)><script>alert(2)</script>');
    });

    it('is a keyboard-reachable region named after the file', () => {
        render(<CodeView code="x = 1" filename="main.py" />);

        const region = screen.getByRole('region', { name: 'Contents of main.py' });
        expect(region).toHaveAttribute('tabindex', '0');
    });

    it('is simply named Code without a file name', () => {
        render(<CodeView code="x = 1" />);

        expect(screen.getByRole('region', { name: 'Code' })).toBeInTheDocument();
    });

    it('limits its height and scrolls when maxHeight is given', () => {
        render(<CodeView code="x = 1" filename="a.py" maxHeight="240px" />);

        expect(screen.getByRole('region')).toHaveStyle({ maxHeight: '240px' });
    });

    it('is as tall as its code without maxHeight', () => {
        render(<CodeView code="x = 1" filename="a.py" />);

        expect(screen.getByRole('region').style.maxHeight).toBe('');
    });

    it('renders an empty box for missing code', () => {
        [undefined, null, 42].forEach((code) => {
            const { container, unmount } = render(<CodeView code={code} />);

            expect(codeOf(container).textContent).toBe('');
            expect(gutterOf(container).textContent).toBe('1');
            unmount();
        });
    });
});

describe('CodeView line numbers', () => {
    it('numbers every line in a gutter that is hidden from assistive technology', () => {
        const { container } = render(<CodeView code={'a\nb\nc'} />);

        expect(gutterOf(container).textContent).toBe('1\n2\n3');
        expect(gutterOf(container)).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not count the newline that ends the file as a line', () => {
        const { container } = render(<CodeView code={'a\nb\n'} />);

        expect(gutterOf(container).textContent).toBe('1\n2');
    });

    it('counts a blank last line that is not the end-of-file newline', () => {
        const { container } = render(<CodeView code={'a\n\n'} />);

        expect(gutterOf(container).textContent).toBe('1\n2');
    });

    it('treats Windows and old Mac line endings as one line break each', () => {
        const { container } = render(<CodeView code={'a\r\nb\rc'} />);

        expect(codeOf(container).textContent).toBe('a\nb\nc');
        expect(gutterOf(container).textContent).toBe('1\n2\n3');
    });

    it('numbers an empty file as one line', () => {
        const { container } = render(<CodeView code="" />);

        expect(gutterOf(container).textContent).toBe('1');
    });

    it('leaves the gutter out when showLineNumbers is false', () => {
        const { container } = render(<CodeView code={'a\nb'} showLineNumbers={false} />);

        expect(gutterOf(container)).toBeNull();
        expect(codeOf(container)).toBeInTheDocument();
    });
});

describe('CodeView highlighting', () => {
    it('shows plain text first and colours it once highlight.js and the grammar have loaded', async () => {
        const { container } = render(<CodeView code={'print("hi")'} language="python" />);

        expect(codeOf(container).textContent).toBe('print("hi")');
        expect(container.querySelector('.hljs-keyword')).toBeNull();

        await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());
        expect(hljs.registerLanguage).toHaveBeenCalledWith('python', { grammarFor: 'python' });
        expect(hljs.highlight).toHaveBeenCalledWith('print("hi")', { language: 'python' });
        expect(codeOf(container)).toHaveClass('hljs', 'language-python');
        expect(codeOf(container).textContent).toBe('print("hi")');
    });

    it('highlights in the very first render once the grammar is registered', async () => {
        const first = render(<CodeView code="a = 1" language="python" />);
        await waitFor(() => expect(first.container.querySelector('.hljs-keyword')).toBeInTheDocument());
        hljs.registerLanguage.mockClear();

        const second = render(<CodeView code="b = 2" language="python" />);

        expect(second.container.querySelector('.hljs-keyword')).toHaveTextContent('b = 2');
        expect(hljs.registerLanguage).not.toHaveBeenCalled();
    });

    it('registers a grammar once however many views ask for it', async () => {
        const views = [
            render(<CodeView code="let a = 1" language="javascript" />),
            render(<CodeView code="let b = 2" language="javascript" />),
        ];

        await waitFor(() => views.forEach(({ container }) => {
            expect(container.querySelector('.hljs-keyword')).toBeInTheDocument();
        }));
        expect(registrationsOf('javascript')).toHaveLength(1);

        const later = render(<CodeView code="let c = 3" language="javascript" />);
        expect(later.container.querySelector('.hljs-keyword')).toBeInTheDocument();
        expect(registrationsOf('javascript')).toHaveLength(1);
    });

    it('colours new code at once and never shows the old code coloured', async () => {
        const { container, rerender } = render(<CodeView code="a = 1" language="python" />);
        await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());

        rerender(<CodeView code="b = 2" language="python" />);

        expect(container.querySelector('.hljs-keyword')).toHaveTextContent('b = 2');
        expect(container.textContent).not.toContain('a = 1');
    });

    it('goes back to plain text while the grammar of a new language loads', async () => {
        const { container, rerender } = render(<CodeView code="a = 1" language="python" />);
        await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());

        rerender(<CodeView code="select 1" language="sql" />);

        expect(container.querySelector('.hljs-keyword')).toBeNull();
        expect(codeOf(container).textContent).toBe('select 1');
        await waitFor(() => expect(container.querySelector('.hljs-keyword')).toHaveTextContent('select 1'));
        expect(codeOf(container)).toHaveClass('language-sql');
    });

    it('does not run highlight.js again for a re-render with the same code', async () => {
        const { container, rerender } = render(<CodeView code="a = 1" language="python" />);
        await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());
        hljs.highlight.mockClear();

        rerender(<CodeView code="a = 1" language="python" maxHeight="10rem" />);

        expect(hljs.highlight).not.toHaveBeenCalled();
    });
});

describe('CodeView without colour', () => {
    it.each([
        ['no language', null],
        ['an undefined language', undefined],
        ['plaintext, which needs no grammar', 'plaintext'],
        ['a language it has no grammar for', 'klingon'],
        ['a name that is only on the prototype', 'constructor'],
    ])('stays plain text for %s and loads nothing', async (_label, language) => {
        const { container } = render(<CodeView code="just text" language={language} />);
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(codeOf(container).textContent).toBe('just text');
        expect(codeOf(container)).not.toHaveClass('hljs');
        expect(hljs.highlight).not.toHaveBeenCalled();
        expect(hljs.registerLanguage).not.toHaveBeenCalled();
    });

    it('stays plain text when the grammar fails to load', async () => {
        const { container } = render(<CodeView code="print 1" language="lua" />);

        await waitFor(() => expect(luaLoad).toHaveBeenCalled());
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(codeOf(container).textContent).toBe('print 1');
        expect(codeOf(container)).not.toHaveClass('hljs');
        expect(hljs.highlight).not.toHaveBeenCalled();
    });

    it('stays plain text when highlight.js throws on the code', async () => {
        hljs.highlight.mockImplementation(() => { throw new Error('boom'); });
        const { container } = render(<CodeView code="puts 1" language="ruby" />);

        await waitFor(() => expect(hljs.highlight).toHaveBeenCalledTimes(1));

        expect(codeOf(container).textContent).toBe('puts 1');
        expect(codeOf(container)).not.toHaveClass('hljs');
    });

    it('does not colour text over 200,000 characters, but does at exactly that size', async () => {
        const large = render(<CodeView code={'x'.repeat(200001)} language="go" />);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(codeOf(large.container)).not.toHaveClass('hljs');
        expect(hljs.highlight).not.toHaveBeenCalled();
        expect(registrationsOf('go')).toHaveLength(0);
        large.unmount();

        const limit = render(<CodeView code={'x'.repeat(200000)} language="go" />);
        await waitFor(() => expect(limit.container.querySelector('.hljs-keyword')).toBeInTheDocument());
    });

    it('can be removed while its grammar is still loading', async () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { unmount } = render(<CodeView code="fn main() {}" language="rust" />);
        unmount();

        await waitFor(() => expect(registrationsOf('rust')).toHaveLength(1));
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(errors).not.toHaveBeenCalled();
        errors.mockRestore();
    });
});

describe('CodeView grammars', () => {
    it('has a grammar for every language name languageForFile can give', async () => {
        // lua is left out only because this file makes its grammar fail to load, for the test above
        const names = [...new Set(SOURCE_EXTENSIONS.map((extension) => languageForFile(`file.${extension}`)))]
            .filter((name) => name && name !== 'plaintext' && name !== 'lua');
        expect(names).toHaveLength(25);

        for (const name of names) {
            const { container, unmount } = render(<CodeView code="x" language={name} />);
            await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());
            expect(registrationsOf(name).length).toBeLessThanOrEqual(1);
            unmount();
        }
    });
});
