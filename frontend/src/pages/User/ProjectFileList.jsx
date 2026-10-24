import React from 'react';
import { File as FileIcon, Trash2, Undo2, X } from 'lucide-react';
import { formatFileSize } from '../../utils/projectFiles';

const countOf = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

// Read out whenever the list changes, so a screen reader hears what the next save will do
const describeChanges = (added, removed) => {
    const parts = [];
    if (added) parts.push(`${countOf(added, 'new file')} will be uploaded`);
    if (removed) parts.push(`${countOf(removed, 'file')} will be removed`);
    return parts.length ? `${parts.join(' and ')} when you save.` : '';
};

/**
 * The files of one kind in the project editor: the saved ones, each of which can be marked for removal and
 * kept again until the project is saved, then the ones picked since, each of which can be dropped again.
 * pendingFiles holds { id, file, path } entries; removedFileIds is a Set of saved file ids.
 */
const ProjectFileList = ({
    label,
    existingFiles = [],
    pendingFiles = [],
    removedFileIds = new Set(),
    onRemovePending,
    onToggleRemoveExisting,
    emptyText = 'No files yet.',
}) => {
    // A pending file with the path of a saved one replaces it on save
    const pendingPaths = new Set(pendingFiles.map((entry) => entry.path));
    const removedCount = existingFiles.filter((file) => removedFileIds.has(file.id)).length;

    return (
        <div className="project-file-list-block">
            {existingFiles.length === 0 && pendingFiles.length === 0 ? (
                <p className="project-file-empty">{emptyText}</p>
            ) : (
                <ul className="project-file-list" aria-label={label}>
                    {existingFiles.map((file) => {
                        const removed = removedFileIds.has(file.id);
                        const replaced = !removed && pendingPaths.has(file.path);
                        return (
                            <li key={`saved-${file.id}`} className={`project-file-item${removed ? ' removed' : ''}`}>
                                <FileIcon size={14} className="project-file-icon" />
                                <span className="project-file-path" title={file.path}>{file.path}</span>
                                <span className="project-file-size">{formatFileSize(file.size)}</span>
                                {removed && <span className="project-file-badge">Removed on save</span>}
                                {replaced && <span className="project-file-badge">Replaced on save</span>}
                                <button
                                    type="button"
                                    className="project-file-action"
                                    onClick={() => onToggleRemoveExisting(file.id)}
                                    aria-label={removed ? `Undo removing ${file.path}` : `Remove ${file.path}`}
                                >
                                    {removed ? <><Undo2 size={14} /> Undo</> : <><Trash2 size={14} /> Remove</>}
                                </button>
                            </li>
                        );
                    })}
                    {pendingFiles.map((entry) => (
                        <li key={`new-${entry.id}`} className="project-file-item pending">
                            <FileIcon size={14} className="project-file-icon" />
                            <span className="project-file-path" title={entry.path}>{entry.path}</span>
                            <span className="project-file-size">{formatFileSize(entry.file.size)}</span>
                            <span className="project-file-badge">New</span>
                            <button
                                type="button"
                                className="project-file-action"
                                onClick={() => onRemovePending(entry.id)}
                                aria-label={`Remove new file ${entry.path}`}
                            >
                                <X size={14} /> Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <p className="project-file-status" aria-live="polite">{describeChanges(pendingFiles.length, removedCount)}</p>
        </div>
    );
};

export default ProjectFileList;
