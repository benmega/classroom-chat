import { describe, it, expect, afterEach, vi } from 'vitest';
import {
    FILE_KINDS,
    MODEL_EXTENSIONS,
    SOURCE_EXTENSIONS,
    ASSET_EXTENSIONS,
    FILE_CAPS,
    extensionOf,
    fileKindForName,
    formatFileSize,
    groupProjectFiles,
    primaryModelFile,
    projectFileUrl,
    acceptForKind,
    languageForFile,
    validateNewFiles,
} from './projectFiles';

const MIB = 1024 * 1024;

// A real File whose reported size is set directly, so a 60 MB model does not need 60 MB of memory
const fileOf = (name, size = 10, extra = {}) => {
    const file = new File(['x'], name);
    Object.defineProperty(file, 'size', { value: size });
    Object.entries(extra).forEach(([key, value]) => Object.defineProperty(file, key, { value }));
    return file;
};

// A stored file as the API sends it
const stored = (id, kind, path, size = 10) => ({
    id, kind, path, name: path.split('/').pop(), size,
    url: `/user/project_files/${id}/${path.split('/').pop()}`,
    download_url: `/user/project_files/${id}/${path.split('/').pop()}?download=1`,
});

describe('extension lists and caps', () => {
    it('match the project files contract', () => {
        expect(FILE_KINDS).toEqual({ MODEL: 'model', SOURCE: 'source', ASSET: 'asset' });
        expect(MODEL_EXTENSIONS).toEqual(['stl', 'obj', 'glb', 'gltf', '3mf', 'ply']);
        expect(SOURCE_EXTENSIONS.join(' ')).toBe(
            'py js jsx ts tsx mjs cjs html htm css scss json md txt java c h cpp hpp cs go rs rb php lua sql xml yml yaml toml ini csv gd kt swift sh bat ps1 r m'
        );
        expect(ASSET_EXTENSIONS.join(' ')).toBe('png jpg jpeg gif webp mp3 wav ogg m4a pdf');
        expect(FILE_CAPS).toEqual({
            model: 50 * MIB, source: MIB, asset: 10 * MIB, count: 40, total: 150 * MIB,
        });
    });

    it('never accept a binary that could be run', () => {
        const everything = [...MODEL_EXTENSIONS, ...SOURCE_EXTENSIONS, ...ASSET_EXTENSIONS];
        ['exe', 'msi', 'dll', 'vbs', 'svg'].forEach((extension) => {
            expect(everything).not.toContain(extension);
            expect(fileKindForName(`file.${extension}`)).toBeNull();
        });
    });
});

describe('extensionOf', () => {
    it.each([
        ['main.py', 'py'],
        ['Robot.STL', 'stl'],
        ['archive.tar.gz', 'gz'],
        ['src/app/main.py', 'py'],
        ['C:\\work\\main.py', 'py'],
        ['.gitignore', ''],
        ['notes.', ''],
        ['README', ''],
        ['folder.v2/README', ''],
        ['', ''],
    ])('%j -> %j', (name, expected) => {
        expect(extensionOf(name)).toBe(expected);
    });

    it('gives an empty string for anything that is not a string', () => {
        expect(extensionOf(undefined)).toBe('');
        expect(extensionOf(null)).toBe('');
        expect(extensionOf(42)).toBe('');
    });
});

describe('fileKindForName', () => {
    it.each([
        ['robot.stl', 'model'],
        ['scene.GLB', 'model'],
        ['main.py', 'source'],
        ['src/index.html', 'source'],
        ['photo.jpeg', 'asset'],
        ['theme.mp3', 'asset'],
        ['spec.pdf', 'asset'],
        ['setup.exe', null],
        ['README', null],
        [undefined, null],
    ])('%j -> %j', (name, expected) => {
        expect(fileKindForName(name)).toBe(expected);
    });
});

describe('formatFileSize', () => {
    it.each([
        [0, '0 B'],
        [684, '684 B'],
        [1023, '1023 B'],
        [1024, '1 KB'],
        [1229, '1.2 KB'],
        [1536, '1.5 KB'],
        [10 * 1024, '10 KB'],
        [1048575, '1 MB'],
        [MIB, '1 MB'],
        [3565158, '3.4 MB'],
        [10 * MIB, '10 MB'],
        [150 * MIB, '150 MB'],
        [5 * 1024 ** 3, '5 GB'],
        [2 * 1024 ** 4, '2048 GB'],
    ])('%d bytes -> %s', (bytes, expected) => {
        expect(formatFileSize(bytes)).toBe(expected);
    });

    it('reads anything that is not a size as 0 B', () => {
        [undefined, null, 'abc', -5, NaN, Infinity].forEach((value) => {
            expect(formatFileSize(value)).toBe('0 B');
        });
    });

    it('accepts a numeric string', () => {
        expect(formatFileSize('2048')).toBe('2 KB');
    });
});

describe('groupProjectFiles', () => {
    const files = [
        stored(5, 'source', 'src/util.py'),
        stored(1, 'model', 'b.stl'),
        stored(6, 'asset', 'z.png'),
        stored(2, 'source', 'level10.py'),
        stored(3, 'source', 'level2.py'),
        stored(4, 'model', 'a.stl'),
        stored(7, 'source', 'main.py'),
    ];

    it('splits the files by kind and orders each list by path, numbers naturally', () => {
        const { models, sources, assets } = groupProjectFiles(files);

        expect(models.map((f) => f.path)).toEqual(['a.stl', 'b.stl']);
        expect(sources.map((f) => f.path)).toEqual(['level2.py', 'level10.py', 'main.py', 'src/util.py']);
        expect(assets.map((f) => f.path)).toEqual(['z.png']);
    });

    it('hands back the same file objects and leaves the input order alone', () => {
        const before = files.map((f) => f.id);
        const { sources } = groupProjectFiles(files);

        expect(sources).toContain(files[0]);
        expect(files.map((f) => f.id)).toEqual(before);
    });

    it('copes with files that are missing or not a list', () => {
        [undefined, null, {}, 'files', 42].forEach((value) => {
            expect(groupProjectFiles(value)).toEqual({ models: [], sources: [], assets: [] });
        });
    });

    it('skips entries of an unknown kind and null entries', () => {
        const odd = [null, undefined, { id: 1, kind: 'video', path: 'v.mp4' }, stored(2, 'source', 'a.py')];

        expect(groupProjectFiles(odd).sources).toHaveLength(1);
        expect(groupProjectFiles(odd).models).toEqual([]);
        expect(groupProjectFiles(odd).assets).toEqual([]);
    });

    it('orders by the path a file object has, falling back to its name', () => {
        const nameOnly = { id: 9, kind: 'source', name: 'a.py' };
        const result = groupProjectFiles([stored(1, 'source', 'b.py'), nameOnly]);

        expect(result.sources[0]).toBe(nameOnly);
    });
});

describe('primaryModelFile', () => {
    it('is the first model by path', () => {
        const files = [stored(1, 'source', 'main.py'), stored(2, 'model', 'robot.stl'), stored(3, 'model', 'arm.stl')];

        expect(primaryModelFile(files)).toBe(files[2]);
    });

    it('is null without a model or without files', () => {
        expect(primaryModelFile([stored(1, 'source', 'main.py')])).toBeNull();
        expect(primaryModelFile([])).toBeNull();
        expect(primaryModelFile(undefined)).toBeNull();
    });
});

describe('projectFileUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const file = stored(12, 'model', 'robot.stl');

    it('is the API path of the file when the API shares the origin', () => {
        vi.stubEnv('VITE_API_URL', '');

        expect(projectFileUrl(file)).toBe('/user/project_files/12/robot.stl');
    });

    it('prefixes the API origin when the frontend is hosted apart', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com/');

        expect(projectFileUrl(file)).toBe('https://api.example.com/user/project_files/12/robot.stl');
        expect(projectFileUrl(file, { download: true })).toBe('https://api.example.com/user/project_files/12/robot.stl?download=1');
    });

    it('uses the download URL when asked', () => {
        vi.stubEnv('VITE_API_URL', '');

        expect(projectFileUrl(file, { download: true })).toBe('/user/project_files/12/robot.stl?download=1');
    });

    it('falls back to the plain URL for a file without a download URL', () => {
        const local = { url: 'blob:http://localhost/abc' };

        expect(projectFileUrl(local, { download: true })).toBe('blob:http://localhost/abc');
    });

    it('leaves an absolute URL alone', () => {
        expect(projectFileUrl({ url: 'https://cdn.example.com/a.stl' })).toBe('https://cdn.example.com/a.stl');
    });

    it('is null without a file or without a URL', () => {
        expect(projectFileUrl(null)).toBeNull();
        expect(projectFileUrl(undefined)).toBeNull();
        expect(projectFileUrl({})).toBeNull();
        expect(projectFileUrl({}, { download: true })).toBeNull();
    });
});

describe('acceptForKind', () => {
    it('lists the dotted extensions of a kind', () => {
        expect(acceptForKind('model')).toBe('.stl,.obj,.glb,.gltf,.3mf,.ply');
        expect(acceptForKind('asset')).toBe('.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg,.m4a,.pdf');

        const source = acceptForKind('source').split(',');
        expect(source).toHaveLength(SOURCE_EXTENSIONS.length);
        expect(source[0]).toBe('.py');
        expect(source[source.length - 1]).toBe('.m');
    });

    it('accepts nothing for an unknown kind', () => {
        expect(acceptForKind('video')).toBe('');
        expect(acceptForKind(undefined)).toBe('');
        expect(acceptForKind('constructor')).toBe('');
    });
});

describe('languageForFile', () => {
    // Every source extension, so adding one to the list forces a decision about its highlighting
    const expected = {
        py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        mjs: 'javascript', cjs: 'javascript', html: 'xml', htm: 'xml', css: 'css', scss: 'scss',
        json: 'json', md: 'markdown', txt: 'plaintext', java: 'java', c: 'c', h: 'c', cpp: 'cpp',
        hpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', rb: 'ruby', php: 'php', lua: 'lua',
        sql: 'sql', xml: 'xml', yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini', csv: 'plaintext',
        gd: null, kt: 'kotlin', swift: 'swift', sh: 'bash', bat: 'dos', ps1: 'powershell', r: 'r', m: null,
    };

    it.each(SOURCE_EXTENSIONS)('maps .%s', (extension) => {
        expect(languageForFile(`file.${extension}`)).toBe(expected[extension]);
    });

    it('covers every source extension', () => {
        expect(Object.keys(expected).sort()).toEqual([...SOURCE_EXTENSIONS].sort());
    });

    it('shows GDScript and the ambiguous .m as plain text', () => {
        expect(languageForFile('player.gd')).toBeNull();
        expect(languageForFile('solver.m')).toBeNull();
    });

    it('ignores case and folders', () => {
        expect(languageForFile('Main.PY')).toBe('python');
        expect(languageForFile('src/game/index.Html')).toBe('xml');
    });

    it('is null for unknown or missing extensions and for non-source files', () => {
        expect(languageForFile('data.bin')).toBeNull();
        expect(languageForFile('Makefile')).toBeNull();
        expect(languageForFile('robot.stl')).toBeNull();
        expect(languageForFile('file.constructor')).toBeNull();
        expect(languageForFile(undefined)).toBeNull();
    });
});

describe('validateNewFiles', () => {
    describe('extensions', () => {
        it('accepts files of the right kind, whatever the case, and hands back the same File objects', () => {
            const robot = fileOf('ROBOT.STL');
            const scene = fileOf('scene.glb');

            const { accepted, rejected } = validateNewFiles('model', [robot, scene]);

            expect(accepted).toEqual([robot, scene]);
            expect(accepted[0]).toBe(robot);
            expect(rejected).toEqual([]);
        });

        it('names the supported 3D model types when a model file is wrong', () => {
            const exe = fileOf('Robot.exe');

            const { accepted, rejected } = validateNewFiles('model', [exe]);

            expect(accepted).toEqual([]);
            expect(rejected).toEqual([{
                file: exe,
                reason: 'Robot.exe is not a supported 3D model file. Use STL, OBJ, GLB, GLTF, 3MF or PLY.',
            }]);
        });

        it('explains what a source slot takes', () => {
            const { rejected } = validateNewFiles('source', [fileOf('photo.png')]);

            expect(rejected[0].reason).toBe(
                'photo.png is not a supported code or text file. Use a text or code file such as PY, JS, HTML, CSS or JSON.'
            );
        });

        it('explains what an asset slot takes', () => {
            const { rejected } = validateNewFiles('asset', [fileOf('main.py')]);

            expect(rejected[0].reason).toBe(
                'main.py is not a supported asset file. Use an image (PNG, JPG, GIF or WEBP), a sound (MP3, WAV, OGG or M4A) or a PDF.'
            );
        });

        it('turns away a file with no extension', () => {
            const { rejected } = validateNewFiles('source', [fileOf('Makefile')]);

            expect(rejected).toHaveLength(1);
            expect(rejected[0].reason).toMatch(/^Makefile is not a supported/);
        });

        it('splits a mixed pick into accepted and rejected', () => {
            const good = fileOf('main.py');
            const bad = fileOf('virus.exe');

            const { accepted, rejected } = validateNewFiles('source', [good, bad]);

            expect(accepted).toEqual([good]);
            expect(rejected.map((r) => r.file)).toEqual([bad]);
        });

        it('reads the name from an unnamed object without failing', () => {
            const { rejected } = validateNewFiles('source', [{ size: 5 }]);

            expect(rejected[0].reason).toMatch(/^This file is not a supported/);
        });

        it('accepts a FileList-like object and nothing at all', () => {
            const file = fileOf('main.py');

            expect(validateNewFiles('source', { 0: file, length: 1 }).accepted).toEqual([file]);
            expect(validateNewFiles('source', undefined)).toEqual({ accepted: [], rejected: [] });
            expect(validateNewFiles('source', [])).toEqual({ accepted: [], rejected: [] });
        });

        it('rejects every file for a kind it does not know', () => {
            const { accepted, rejected } = validateNewFiles('video', [fileOf('main.py')]);

            expect(accepted).toEqual([]);
            expect(rejected[0].reason).toBe('main.py cannot be added here.');
        });
    });

    describe('size caps', () => {
        it.each([
            ['model', 'robot.stl', 50 * MIB, '50 MB'],
            ['source', 'main.py', MIB, '1 MB'],
            ['asset', 'photo.png', 10 * MIB, '10 MB'],
        ])('allows a %s file of exactly the cap and refuses one byte more', (kind, name, cap, label) => {
            const exact = fileOf(name, cap);
            const over = fileOf(name, cap + 1);

            expect(validateNewFiles(kind, [exact]).accepted).toEqual([exact]);
            expect(validateNewFiles(kind, [over]).rejected).toEqual([{ file: over, reason: `${name} is larger than ${label}.` }]);
        });

        it('counts a file with no known size as empty', () => {
            const unsized = { name: 'main.py' };

            expect(validateNewFiles('source', [unsized]).accepted).toEqual([unsized]);
        });

        it('checks the extension before the size', () => {
            const { rejected } = validateNewFiles('model', [fileOf('huge.exe', 999 * MIB)]);

            expect(rejected[0].reason).toMatch(/not a supported 3D model file/);
        });
    });
});

describe('validateNewFiles project limits', () => {
    const COUNT_MESSAGE = 'A project can hold at most 40 files.';
    const TOTAL_MESSAGE = 'Project files add up to more than 150 MB.';
    const storedFiles = (count, size = 10) => (
        Array.from({ length: count }, (_, i) => stored(i + 1, 'source', `file${i}.py`, size))
    );

    describe('file count', () => {
        it('lets the 40th file in and turns the 41st away', () => {
            const fits = fileOf('new.py');
            expect(validateNewFiles('source', [fits], { existing: storedFiles(39) }).accepted).toEqual([fits]);

            const extra = fileOf('new.py');
            const { accepted, rejected } = validateNewFiles('source', [extra], { existing: storedFiles(40) });
            expect(accepted).toEqual([]);
            expect(rejected).toEqual([{ file: extra, reason: COUNT_MESSAGE }]);
        });

        it('counts files that are chosen but not uploaded yet, of any kind', () => {
            const pendingAdds = [fileOf('a.png'), fileOf('b.stl')];

            const { rejected } = validateNewFiles('source', [fileOf('c.py')], {
                existing: storedFiles(38),
                pendingAdds,
            });

            expect(rejected[0].reason).toBe(COUNT_MESSAGE);
        });

        it('counts the files accepted earlier in the same pick', () => {
            const picked = Array.from({ length: 5 }, (_, i) => fileOf(`pick${i}.py`));

            const { accepted, rejected } = validateNewFiles('source', picked, { existing: storedFiles(37) });

            expect(accepted).toHaveLength(3);
            expect(rejected.map((r) => r.reason)).toEqual([COUNT_MESSAGE, COUNT_MESSAGE]);
        });

        it('does not count a file that replaces one with the same path', () => {
            const existing = storedFiles(40);
            const replacement = fileOf('file7.py');

            const { accepted, rejected } = validateNewFiles('source', [replacement], { existing });

            expect(accepted).toEqual([replacement]);
            expect(rejected).toEqual([]);
        });

        it('recognises the path of a folder upload', () => {
            const existing = [...storedFiles(39), stored(99, 'source', 'src/main.py')];
            const replacement = fileOf('main.py', 10, { webkitRelativePath: 'src/main.py' });

            expect(validateNewFiles('source', [replacement], { existing }).accepted).toEqual([replacement]);
        });
    });

    describe('total size', () => {
        it('allows the total to reach the cap and refuses what goes past it', () => {
            const models = [1, 2, 3, 4].map((n) => fileOf(`m${n}.stl`, 50 * MIB));

            const { accepted, rejected } = validateNewFiles('model', models);

            expect(accepted).toHaveLength(3);
            expect(rejected).toEqual([{ file: models[3], reason: TOTAL_MESSAGE }]);
        });

        it('adds up the stored files and the pending ones', () => {
            const existing = [stored(1, 'model', 'a.stl', 50 * MIB), stored(2, 'model', 'b.stl', 50 * MIB)];
            const pendingAdds = [fileOf('c.stl', 40 * MIB)];

            expect(validateNewFiles('model', [fileOf('d.stl', 10 * MIB)], { existing, pendingAdds }).accepted).toHaveLength(1);
            expect(validateNewFiles('model', [fileOf('d.stl', 10 * MIB + 1)], { existing, pendingAdds }).rejected[0].reason).toBe(TOTAL_MESSAGE);
        });

        it('puts the size of a replacement in place of the old file, not on top of it', () => {
            const existing = [
                stored(1, 'model', 'a.stl', 50 * MIB),
                stored(2, 'model', 'b.stl', 50 * MIB),
                stored(3, 'asset', 'photo.png', 10 * MIB),
                stored(4, 'model', 'c.stl', 40 * MIB),
            ];

            const same = fileOf('photo.png', 10 * MIB);
            expect(validateNewFiles('asset', [same], { existing }).accepted).toEqual([same]);

            const other = fileOf('other.png', 1);
            expect(validateNewFiles('asset', [other], { existing }).rejected[0].reason).toBe(TOTAL_MESSAGE);
        });

        it('checks the count before the total', () => {
            const existing = storedFiles(40, 4 * MIB);

            const { rejected } = validateNewFiles('source', [fileOf('x.py', MIB)], { existing });

            expect(rejected[0].reason).toBe(COUNT_MESSAGE);
        });
    });
});
