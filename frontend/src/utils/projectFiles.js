import { formatStaticUrl } from './formatters';

// The extension lists and caps below are the ones the backend enforces (its extension allowlists and
// Config.PROJECT_*_MAX_BYTES / PROJECT_FILES_MAX_*). The server stays the authority: these copies only
// let the editor turn a file away before a slow upload starts, so keep them in step with the backend.
export const FILE_KINDS = { MODEL: 'model', SOURCE: 'source', ASSET: 'asset' };

export const MODEL_EXTENSIONS = ['stl', 'obj', 'glb', 'gltf', '3mf', 'ply'];
export const SOURCE_EXTENSIONS = [
    'py', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'css', 'scss', 'json', 'md', 'txt',
    'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'lua', 'sql', 'xml', 'yml', 'yaml',
    'toml', 'ini', 'csv', 'gd', 'kt', 'swift', 'sh', 'bat', 'ps1', 'r', 'm',
];
export const ASSET_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a', 'pdf'];

const MIB = 1024 * 1024;
export const FILE_CAPS = { model: 50 * MIB, source: MIB, asset: 10 * MIB, count: 40, total: 150 * MIB };

// Lower-case extension of a file name or path, or '' when there is none. A leading dot (".gitignore")
// or a trailing one ("notes.") does not make an extension, and a dot in a folder name is ignored.
export const extensionOf = (name) => {
    if (typeof name !== 'string') return '';
    const base = name.split(/[/\\]/).pop();
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
};

export const fileKindForName = (name) => {
    const extension = extensionOf(name);
    if (MODEL_EXTENSIONS.includes(extension)) return FILE_KINDS.MODEL;
    if (SOURCE_EXTENSIONS.includes(extension)) return FILE_KINDS.SOURCE;
    if (ASSET_EXTENSIONS.includes(extension)) return FILE_KINDS.ASSET;
    return null;
};

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

// '684 B', '1.2 KB', '3.4 MB'. Units step by 1024 (the caps are in MiB) with one decimal, dropped when
// it would be ".0" so a cap reads '1 MB' and '150 MB'. Anything that is not a size reads '0 B'.
export const formatFileSize = (bytes) => {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) return '0 B';
    if (size < 1024) return `${Math.floor(size)} B`;

    let value = size / 1024;
    let unit = 1;
    // 1023.99 KB rounds to 1024.0, which has to read as '1 MB'
    while (Math.round(value * 10) / 10 >= 1024 && unit < SIZE_UNITS.length - 1) {
        value /= 1024;
        unit += 1;
    }
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${SIZE_UNITS[unit]}`;
};

const pathOf = (file) => file.path || file.webkitRelativePath || file.name || '';
const sizeOf = (file) => Number(file.size) || 0;

// Natural order, so "level2.py" comes before "level10.py"
const byPath = (a, b) => pathOf(a).localeCompare(pathOf(b), undefined, { numeric: true });

// The project's files split by kind, each list ordered by path. Missing or malformed `files` (a project
// loaded without them, an old cached response) gives three empty lists; the objects are not copied.
export const groupProjectFiles = (files) => {
    const groups = { models: [], sources: [], assets: [] };
    if (!Array.isArray(files)) return groups;
    files.forEach((file) => {
        if (file?.kind === FILE_KINDS.MODEL) groups.models.push(file);
        else if (file?.kind === FILE_KINDS.SOURCE) groups.sources.push(file);
        else if (file?.kind === FILE_KINDS.ASSET) groups.assets.push(file);
    });
    Object.values(groups).forEach((list) => list.sort(byPath));
    return groups;
};

export const primaryModelFile = (files) => groupProjectFiles(files).models[0] ?? null;

// Absolute URL of a stored file. The download URL (Content-Disposition: attachment) falls back to the
// plain one for a file object that has none, such as a file picked in the editor and not saved yet.
// That file's blob: URL is already absolute, and formatStaticUrl would read it as a relative path.
export const projectFileUrl = (file, { download = false } = {}) => {
    if (!file) return null;
    const url = download ? (file.download_url || file.url) : file.url;
    return typeof url === 'string' && url.startsWith('blob:') ? url : formatStaticUrl(url);
};

const extensionsForKind = (kind) => {
    if (kind === FILE_KINDS.MODEL) return MODEL_EXTENSIONS;
    if (kind === FILE_KINDS.SOURCE) return SOURCE_EXTENSIONS;
    if (kind === FILE_KINDS.ASSET) return ASSET_EXTENSIONS;
    return [];
};

// Value for <input accept>: '.stl,.obj,...'. An unknown kind accepts nothing.
export const acceptForKind = (kind) => extensionsForKind(kind).map((extension) => `.${extension}`).join(',');

// highlight.js language ids. Where no grammar exists the file is shown as plain text: GDScript (gd) is
// not in highlight.js, and ".m" could be Objective-C or MATLAB, so guessing would colour half of the
// files wrongly. html and xml share one grammar, toml is covered by the ini grammar, and batch files use
// the grammar highlight.js calls dos.
const LANGUAGES = new Map(Object.entries({
    py: 'python',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    html: 'xml', htm: 'xml', xml: 'xml',
    css: 'css', scss: 'scss',
    json: 'json',
    md: 'markdown',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    lua: 'lua',
    sql: 'sql',
    yml: 'yaml', yaml: 'yaml',
    toml: 'ini', ini: 'ini',
    kt: 'kotlin',
    swift: 'swift',
    sh: 'bash',
    bat: 'dos',
    ps1: 'powershell',
    r: 'r',
    txt: 'plaintext', csv: 'plaintext',
}));

export const languageForFile = (name) => LANGUAGES.get(extensionOf(name)) ?? null;

// User-facing wording per kind. The model hint is built from the list so the two cannot drift apart.
const upperList = (extensions) => `${extensions.slice(0, -1).map((e) => e.toUpperCase()).join(', ')} or ${extensions[extensions.length - 1].toUpperCase()}`;

const KIND_MESSAGES = new Map([
    [FILE_KINDS.MODEL, {
        label: '3D model file',
        hint: `Use ${upperList(MODEL_EXTENSIONS)}.`,
    }],
    [FILE_KINDS.SOURCE, {
        label: 'code or text file',
        hint: 'Use a text or code file such as PY, JS, HTML, CSS or JSON.',
    }],
    [FILE_KINDS.ASSET, {
        label: 'asset file',
        hint: 'Use an image (PNG, JPG, GIF or WEBP), a sound (MP3, WAV, OGG or M4A) or a PDF.',
    }],
]);

// Pre-check of files the user picked for one kind of slot, against the extension list and the caps.
//   existing:    the project's stored files that will still be there after the save
//   pendingAdds: files already chosen in this edit but not uploaded yet (any kind)
// A picked file whose path is already held replaces it, as on the server: it adds nothing to the file
// count and its size takes the old one's place in the total. Each rejected file carries one sentence
// that can be shown as it is; the first check that fails wins.
export const validateNewFiles = (kind, files, { existing = [], pendingAdds = [] } = {}) => {
    const messages = KIND_MESSAGES.get(kind);
    const extensions = extensionsForKind(kind);

    const held = new Map();
    [...existing, ...pendingAdds].forEach((file) => held.set(pathOf(file), sizeOf(file)));
    let total = 0;
    held.forEach((size) => { total += size; });

    const accepted = [];
    const rejected = [];
    Array.from(files || []).forEach((file) => {
        const label = file.name || 'This file';
        const path = pathOf(file);
        const size = sizeOf(file);
        const replacedSize = held.get(path);
        let reason = null;

        if (!messages) {
            reason = `${label} cannot be added here.`;
        } else if (!extensions.includes(extensionOf(file.name || path))) {
            reason = `${label} is not a supported ${messages.label}. ${messages.hint}`;
        } else if (size > FILE_CAPS[kind]) {
            reason = `${label} is larger than ${formatFileSize(FILE_CAPS[kind])}.`;
        } else if (replacedSize === undefined && held.size >= FILE_CAPS.count) {
            reason = `A project can hold at most ${FILE_CAPS.count} files.`;
        } else if (total - (replacedSize || 0) + size > FILE_CAPS.total) {
            reason = `Project files add up to more than ${formatFileSize(FILE_CAPS.total)}.`;
        }

        if (reason) {
            rejected.push({ file, reason });
        } else {
            accepted.push(file);
            total += size - (replacedSize || 0);
            held.set(path, size);
        }
    });

    return { accepted, rejected };
};
