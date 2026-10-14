import { useEffect, useMemo, useState } from 'react';
import './CodeView.css';

// Every grammar the app can ask for (the ids languageForFile returns, plaintext aside), each behind its
// own literal import(): a bundler cannot resolve a computed specifier for a package name. vite.config.js
// puts all of highlight.js in the lazily loaded vendor-hljs chunk, so none of it is in the entry bundle.
const GRAMMARS = new Map([
    ['bash', () => import('highlight.js/lib/languages/bash')],
    ['c', () => import('highlight.js/lib/languages/c')],
    ['cpp', () => import('highlight.js/lib/languages/cpp')],
    ['csharp', () => import('highlight.js/lib/languages/csharp')],
    ['css', () => import('highlight.js/lib/languages/css')],
    ['dos', () => import('highlight.js/lib/languages/dos')],
    ['go', () => import('highlight.js/lib/languages/go')],
    ['ini', () => import('highlight.js/lib/languages/ini')],
    ['java', () => import('highlight.js/lib/languages/java')],
    ['javascript', () => import('highlight.js/lib/languages/javascript')],
    ['json', () => import('highlight.js/lib/languages/json')],
    ['kotlin', () => import('highlight.js/lib/languages/kotlin')],
    ['lua', () => import('highlight.js/lib/languages/lua')],
    ['markdown', () => import('highlight.js/lib/languages/markdown')],
    ['php', () => import('highlight.js/lib/languages/php')],
    ['powershell', () => import('highlight.js/lib/languages/powershell')],
    ['python', () => import('highlight.js/lib/languages/python')],
    ['r', () => import('highlight.js/lib/languages/r')],
    ['ruby', () => import('highlight.js/lib/languages/ruby')],
    ['rust', () => import('highlight.js/lib/languages/rust')],
    ['scss', () => import('highlight.js/lib/languages/scss')],
    ['sql', () => import('highlight.js/lib/languages/sql')],
    ['swift', () => import('highlight.js/lib/languages/swift')],
    ['typescript', () => import('highlight.js/lib/languages/typescript')],
    ['xml', () => import('highlight.js/lib/languages/xml')],
    ['yaml', () => import('highlight.js/lib/languages/yaml')],
]);

// Colouring a file this large would stall the page for seconds (the upload cap is 1 MB), and text that
// size is hard to read in a small panel anyway, so it is shown as it is.
const MAX_HIGHLIGHT_CHARS = 200000;

// One registration per grammar, shared by every CodeView on the page. import() hands out the same
// module every time, so asking for the core again for each grammar costs nothing.
let core = null;
const registeredGrammars = new Set();
const grammarLoads = new Map();

const loadGrammar = (language) => {
    if (!grammarLoads.has(language)) {
        const load = Promise.all([import('highlight.js/lib/core'), GRAMMARS.get(language)()]).then(([coreModule, grammarModule]) => {
            core = coreModule.default;
            core.registerLanguage(language, grammarModule.default);
            registeredGrammars.add(language);
        });
        grammarLoads.set(language, load);
    }
    return grammarLoads.get(language);
};

// highlight.js escapes the code it is given, so its output is the only HTML this component ever inserts.
const highlightToHtml = (hljs, code, language) => {
    try {
        return hljs.highlight(code, { language }).value;
    } catch {
        // A grammar that fails on some input is not worth an error: the plain text is still readable
        return null;
    }
};

// One number per line of the text. The newline that ends a file does not start a line of its own.
const lineNumbersFor = (text) => {
    const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    return Array.from({ length: Math.max(lines, 1) }, (_, index) => index + 1).join('\n');
};

// Source text with a line-number gutter, syntax-coloured when a grammar for `language` is known. The
// plain text is on screen from the first render and stays when there is no grammar, the grammar fails
// to load, or the text is too large; colour arrives once highlight.js and the one grammar are in.
const CodeView = ({ code, language = null, filename, showLineNumbers = true, maxHeight }) => {
    // CRLF files from Windows would otherwise show a stray carriage return on every line
    const text = useMemo(() => (typeof code === 'string' ? code.replace(/\r\n?/g, '\n') : ''), [code]);
    const grammar = GRAMMARS.has(language) && text.length <= MAX_HIGHLIGHT_CHARS ? language : null;

    // Bumped when a grammar arrives, so the component renders again and finds it registered
    const [, setGrammarsLoaded] = useState(0);
    useEffect(() => {
        if (!grammar || registeredGrammars.has(grammar)) return undefined;
        let active = true;
        loadGrammar(grammar).then(
            () => { if (active) setGrammarsLoaded((count) => count + 1); },
            () => {} // colour is a nicety: the plain text stays
        );
        return () => { active = false; };
    }, [grammar]);

    // A grammar that is already registered colours the very first render, so moving between two files
    // of one language does not flash plain text
    const hljs = grammar && registeredGrammars.has(grammar) ? core : null;
    const html = useMemo(() => (hljs ? highlightToHtml(hljs, text, grammar) : null), [hljs, text, grammar]);
    const lineNumbers = useMemo(() => (showLineNumbers ? lineNumbersFor(text) : null), [showLineNumbers, text]);

    return (
        <div
            className="code-view"
            role="region"
            aria-label={filename ? `Contents of ${filename}` : 'Code'}
            // A box that scrolls must be reachable by keyboard, or its overflowing lines cannot be read without a mouse
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            style={maxHeight ? { maxHeight } : undefined}
        >
            <div className="code-view-body">
                {lineNumbers && <div className="code-view-gutter" aria-hidden="true">{lineNumbers}</div>}
                <pre className="code-view-pre">
                    {html === null ? (
                        <code className="code-view-code">{text}</code>
                    ) : (
                        <code className={`code-view-code hljs language-${grammar}`} dangerouslySetInnerHTML={{ __html: html }} />
                    )}
                </pre>
            </div>
        </div>
    );
};

export default CodeView;
