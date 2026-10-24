import { render, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CodeView from './CodeView';
import { SOURCE_EXTENSIONS, languageForFile } from '../../utils/projectFiles';

// The real highlight.js, unmocked. CodeView.test.jsx cannot show that the grammar paths resolve, that
// each module's default export is a usable grammar, or that what comes out is safe to insert as HTML.
const highlighted = (container) => container.querySelector('code.hljs');
const loaded = { timeout: 5000 };

describe('CodeView with the real highlight.js', () => {
    it('colours Python without changing its text', async () => {
        const code = 'def greet(name):\n    return "hi " + name  # say hi\n';
        const { container } = render(<CodeView code={code} language="python" />);

        await waitFor(() => expect(highlighted(container)).toBeInTheDocument(), loaded);

        expect(container.querySelector('.hljs-keyword')).toHaveTextContent('def');
        expect(container.querySelector('.hljs-string')).toHaveTextContent('"hi "');
        expect(container.querySelector('.hljs-comment')).toHaveTextContent('# say hi');
        expect(highlighted(container).textContent).toBe(code);
    });

    it.each(['xml', 'javascript', 'markdown'])('shows markup in %s code as text instead of inserting it', async (language) => {
        const code = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
        const { container } = render(<CodeView code={code} language={language} />);

        await waitFor(() => expect(highlighted(container)).toBeInTheDocument(), loaded);

        expect(container.querySelector('img, script')).toBeNull();
        expect(highlighted(container).textContent).toBe(code);
    });

    it('has a working grammar for every language name languageForFile can give', async () => {
        const names = [...new Set(SOURCE_EXTENSIONS.map((extension) => languageForFile(`file.${extension}`)))]
            .filter((name) => name && name !== 'plaintext');
        expect(names).toHaveLength(26);

        for (const name of names) {
            const { container, unmount } = render(<CodeView code="x = 1" language={name} />);
            await waitFor(() => expect(highlighted(container)).toBeInTheDocument(), loaded);
            expect(highlighted(container)).toHaveClass(`language-${name}`);
            unmount();
        }
    });
});
