// STUB. The real module belongs to lane fe-filebrowser (contract 4.1); the integrator replaces this file with the
// owner's version. It only gives the admin pages what they call (grouping, primary model, URLs) and keeps every
// other export inert, so nothing here may grow logic.
import { formatStaticUrl } from './formatters';

export const FILE_KINDS = { MODEL: 'model', SOURCE: 'source', ASSET: 'asset' };
export const MODEL_EXTENSIONS = ['stl', 'obj', 'glb', 'gltf', '3mf', 'ply'];
export const SOURCE_EXTENSIONS = [
    'py', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'css', 'scss', 'json', 'md', 'txt', 'java', 'c', 'h',
    'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'lua', 'sql', 'xml', 'yml', 'yaml', 'toml', 'ini', 'csv', 'gd', 'kt',
    'swift', 'sh', 'bat', 'ps1', 'r', 'm'
];
export const ASSET_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a', 'pdf'];
export const FILE_CAPS = { model: 50 * 1024 * 1024, source: 1024 * 1024, asset: 10 * 1024 * 1024, count: 40, total: 150 * 1024 * 1024 };

export const extensionOf = () => '';
export const fileKindForName = () => null;
export const formatFileSize = (bytes) => `${bytes} B`;
export const acceptForKind = () => '';
export const languageForFile = () => null;
export const validateNewFiles = (_kind, files) => ({ accepted: Array.from(files), rejected: [] });

export const groupProjectFiles = (files) => {
    const list = Array.isArray(files) ? files : [];
    return {
        models: list.filter((f) => f.kind === FILE_KINDS.MODEL),
        sources: list.filter((f) => f.kind === FILE_KINDS.SOURCE),
        assets: list.filter((f) => f.kind === FILE_KINDS.ASSET)
    };
};
export const primaryModelFile = (files) => groupProjectFiles(files).models[0] || null;
export const projectFileUrl = (file, { download = false } = {}) => formatStaticUrl(download ? file.download_url : file.url);
