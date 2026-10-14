// STUB from the fe-editor lane. This module belongs to the fe-filebrowser lane (contract 4.1), whose version
// replaces this file when the lanes are merged. It holds only what the project editor needs to run and be tested
// on its own: the constants, small helpers, and a validator that checks the extension and the per-file cap.
import { formatStaticUrl } from './formatters';

export const FILE_KINDS = { MODEL: 'model', SOURCE: 'source', ASSET: 'asset' };
export const MODEL_EXTENSIONS = ['stl', 'obj', 'glb', 'gltf', '3mf', 'ply'];
export const SOURCE_EXTENSIONS = [
    'py', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'css', 'scss', 'json', 'md', 'txt', 'java', 'c',
    'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'lua', 'sql', 'xml', 'yml', 'yaml', 'toml', 'ini', 'csv', 'gd',
    'kt', 'swift', 'sh', 'bat', 'ps1', 'r', 'm',
];
export const ASSET_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a', 'pdf'];
export const FILE_CAPS = { model: 50 * 1024 * 1024, source: 1024 * 1024, asset: 10 * 1024 * 1024, count: 40, total: 150 * 1024 * 1024 };

const EXTENSIONS = { model: MODEL_EXTENSIONS, source: SOURCE_EXTENSIONS, asset: ASSET_EXTENSIONS };

export const extensionOf = (name) => {
    const base = String(name || '').split('/').pop();
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
};

export const fileKindForName = (name) => Object.keys(EXTENSIONS).find((kind) => EXTENSIONS[kind].includes(extensionOf(name))) || null;

export const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const groupProjectFiles = (files) => {
    const byPath = [...(files || [])].sort((a, b) => a.path.localeCompare(b.path));
    return {
        models: byPath.filter((file) => file.kind === 'model'),
        sources: byPath.filter((file) => file.kind === 'source'),
        assets: byPath.filter((file) => file.kind === 'asset'),
    };
};

export const primaryModelFile = (files) => (files || []).find((file) => file.kind === 'model') || null;

export const projectFileUrl = (file, { download = false } = {}) => formatStaticUrl(download ? file.download_url : file.url);

export const acceptForKind = (kind) => (EXTENSIONS[kind] || []).map((extension) => `.${extension}`).join(',');

export const languageForFile = () => null;

// The real validator also enforces the per-project count and total caps against `existing` and `pendingAdds`.
export const validateNewFiles = (kind, files, _options = {}) => {
    const accepted = [];
    const rejected = [];
    Array.from(files || []).forEach((file) => {
        if (!(EXTENSIONS[kind] || []).includes(extensionOf(file.name))) {
            rejected.push({ file, reason: `${file.name} is not a file type this part of the project takes.` });
        } else if (file.size > FILE_CAPS[kind]) {
            rejected.push({ file, reason: `${file.name} is larger than ${formatFileSize(FILE_CAPS[kind])}.` });
        } else {
            accepted.push(file);
        }
    });
    return { accepted, rejected };
};
