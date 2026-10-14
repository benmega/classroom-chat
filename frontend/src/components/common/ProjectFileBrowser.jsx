import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Download, FileCode, Folder, FolderOpen, Loader2, RefreshCw } from 'lucide-react';
import client from '../../api/client';
import { formatFileSize, groupProjectFiles, languageForFile, projectFileUrl } from '../../utils/projectFiles';
import CodeView from './CodeView';
import './ProjectFileBrowser.css';

// A file object without a path (the contract always sends one) is shown by its name
const pathOf = (file) => file.path || file.name;

// Natural order, so "level2.py" comes before "level10.py"
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

const sortTree = (node) => {
    node.folders.sort(byName);
    node.files.sort(byName);
    node.folders.forEach(sortTree);
};

// The folder tree of the files' paths: folders before files, each in natural name order.
const buildTree = (files) => {
    const root = { name: '', path: '', folders: [], files: [] };
    files.forEach((file) => {
        const segments = pathOf(file).split('/').filter(Boolean);
        const name = segments.pop();
        let node = root;
        segments.forEach((segment) => {
            let folder = node.folders.find((candidate) => candidate.name === segment);
            if (!folder) {
                folder = { name: segment, path: node.path ? `${node.path}/${segment}` : segment, folders: [], files: [] };
                node.folders.push(folder);
            }
            node = folder;
        });
        node.files.push({ file, name });
    });
    sortTree(root);
    return root;
};

// The text of the selected file, fetched the first time it is shown and kept for as long as the browser
// lives: a file id never changes what it points at (a replaced path gets a new id), so there is nothing
// to refresh. A failed request is remembered until Retry, so a file that is down is not hammered.
const useSourceText = (file) => {
    const [texts, setTexts] = useState({});
    const [failed, setFailed] = useState({});
    // Ids with a request on the way, so the re-runs this effect gets (React's development double-run, or
    // another file's text arriving) do not start the same request twice
    const inFlight = useRef(new Set());
    const id = file ? file.id : null;

    useEffect(() => {
        if (!file || texts[id] !== undefined || failed[id] || inFlight.current.has(id)) return;
        inFlight.current.add(id);
        // projectFileUrl already gives a full URL, so the client's base URL must stay out of it: axios would
        // glue the API origin in front of the blob: URL of a file picked in the editor and not saved yet
        client.get(projectFileUrl(file), { responseType: 'text', baseURL: '' })
            .then(
                (response) => setTexts((previous) => ({ ...previous, [id]: response.data })),
                () => setFailed((previous) => ({ ...previous, [id]: true }))
            )
            .finally(() => inFlight.current.delete(id));
    }, [file, id, texts, failed]);

    const retry = () => setFailed((previous) => {
        const { [id]: _removed, ...rest } = previous;
        return rest;
    });

    if (texts[id] !== undefined) return { status: 'ready', text: texts[id], retry };
    if (failed[id]) return { status: 'error', retry };
    return { status: 'loading', retry };
};

const FileTree = ({ node, selectedId, collapsed, onToggle, onSelect }) => (
    <ul className="project-files-list">
        {node.folders.map((folder) => {
            const open = !collapsed.has(folder.path);
            return (
                <li key={folder.path}>
                    <button type="button" className="project-files-item" aria-expanded={open} onClick={() => onToggle(folder.path)}>
                        {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                        {open ? <FolderOpen size={16} aria-hidden="true" /> : <Folder size={16} aria-hidden="true" />}
                        <span className="project-files-label">{folder.name}</span>
                    </button>
                    {open && (
                        <FileTree node={folder} selectedId={selectedId} collapsed={collapsed} onToggle={onToggle} onSelect={onSelect} />
                    )}
                </li>
            );
        })}
        {node.files.map(({ file, name }) => {
            const selected = file.id === selectedId;
            return (
                <li key={file.id}>
                    <button
                        type="button"
                        className={`project-files-item project-files-file${selected ? ' is-selected' : ''}`}
                        aria-current={selected ? 'true' : undefined}
                        title={pathOf(file)}
                        onClick={() => onSelect(file.id)}
                    >
                        <FileCode size={16} aria-hidden="true" />
                        <span className="project-files-label">{name}</span>
                    </button>
                </li>
            );
        })}
    </ul>
);

// A project's source files: a collapsible tree of their paths and the code of the selected one, with its
// size and a download link. `files` is the project's whole file list; only the source files are shown.
// Renders nothing when there are none.
const ProjectFileBrowser = ({ files, initialFileId, className = '', maxHeight = '28rem' }) => {
    const sources = useMemo(() => groupProjectFiles(files).sources, [files]);
    const tree = useMemo(() => buildTree(sources), [sources]);
    const [selectedId, setSelectedId] = useState(initialFileId);
    const [collapsed, setCollapsed] = useState(() => new Set());

    // An id that is not (or no longer) among the source files falls back to the first file
    const selected = sources.find((file) => file.id === selectedId) ?? sources[0] ?? null;
    const source = useSourceText(selected);

    if (!selected) return null;

    const toggleFolder = (path) => setCollapsed((previous) => {
        const next = new Set(previous);
        if (!next.delete(path)) next.add(path);
        return next;
    });

    return (
        <section
            className={`project-files ${className}`.trim()}
            aria-label="Project source files"
            style={{ '--project-files-max-height': maxHeight }}
        >
            <div className="project-files-layout">
                <div className="project-files-tree" role="group" aria-label="Source files">
                    <FileTree node={tree} selectedId={selected.id} collapsed={collapsed} onToggle={toggleFolder} onSelect={setSelectedId} />
                </div>
                <div className="project-files-viewer">
                    <div className="project-files-bar">
                        <span className="project-files-path" title={pathOf(selected)}>{pathOf(selected)}</span>
                        <span className="project-files-size">{formatFileSize(selected.size)}</span>
                        <a
                            className="project-files-download"
                            href={projectFileUrl(selected, { download: true })}
                            download={selected.name}
                            aria-label={`Download ${selected.name}`}
                        >
                            <Download size={14} aria-hidden="true" /> Download
                        </a>
                    </div>
                    <div className="project-files-body">
                        {source.status === 'loading' && (
                            <p className="project-files-status" role="status">
                                <Loader2 className="project-files-spinner" size={16} aria-hidden="true" />
                                {`Loading ${selected.name}...`}
                            </p>
                        )}
                        {source.status === 'error' && (
                            <div className="project-files-status project-files-error" role="alert">
                                <AlertCircle size={16} aria-hidden="true" />
                                <span>{`Could not load ${selected.name}.`}</span>
                                <button type="button" className="project-files-retry" onClick={source.retry}>
                                    <RefreshCw size={14} aria-hidden="true" /> Retry
                                </button>
                            </div>
                        )}
                        {source.status === 'ready' && (source.text === '' ? (
                            <p className="project-files-status">This file is empty.</p>
                        ) : (
                            <CodeView
                                code={source.text}
                                language={languageForFile(selected.name)}
                                filename={selected.name}
                                maxHeight={maxHeight}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProjectFileBrowser;
