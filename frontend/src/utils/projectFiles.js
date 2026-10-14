// STUB created by the fe-display lane. The fe-filebrowser lane owns this module (CONTRACT.md 4.1) and the
// integrator replaces this file with theirs. It carries the agreed exports only: the three helpers the
// profile components call get one-line bodies so those components work in this lane, the rest are inert.
import { formatStaticUrl } from './formatters';

export const FILE_KINDS = { MODEL: 'model', SOURCE: 'source', ASSET: 'asset' };
export const MODEL_EXTENSIONS = ['stl', 'obj', 'glb', 'gltf', '3mf', 'ply'];
export const SOURCE_EXTENSIONS = [
    'py', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'html', 'htm', 'css', 'scss', 'json', 'md', 'txt', 'java', 'c', 'h',
    'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'lua', 'sql', 'xml', 'yml', 'yaml', 'toml', 'ini', 'csv', 'gd', 'kt',
    'swift', 'sh', 'bat', 'ps1', 'r', 'm',
];
export const ASSET_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a', 'pdf'];
export const FILE_CAPS = { model: 50 * 1024 * 1024, source: 1024 * 1024, asset: 10 * 1024 * 1024, count: 40, total: 150 * 1024 * 1024 };

const ofKind = (files, kind) => (files || []).filter((file) => file.kind === kind);

export const extensionOf = () => '';
export const fileKindForName = () => null;
export const formatFileSize = (bytes) => `${bytes} B`;
export const groupProjectFiles = (files) => ({ models: ofKind(files, 'model'), sources: ofKind(files, 'source'), assets: ofKind(files, 'asset') });
export const primaryModelFile = (files) => ofKind(files, 'model')[0] || null;
export const projectFileUrl = (file, { download = false } = {}) => formatStaticUrl(download ? file.download_url : file.url);
export const acceptForKind = () => '';
export const languageForFile = () => null;
export const validateNewFiles = (_kind, files) => ({ accepted: Array.from(files || []), rejected: [] });
