import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ProjectFileList from './ProjectFileList';
import { formatFileSize } from '../../utils/projectFiles';

const saved = [
    { id: 1, kind: 'source', name: 'main.py', path: 'src/main.py', size: 1200 },
    { id: 2, kind: 'source', name: 'utils.py', path: 'src/utils.py', size: 300 },
];
const picked = (id, path, content = 'print(1)') => ({ id, path, file: new File([content], path.split('/').pop()) });

const renderList = (props = {}) => {
    const handlers = { onRemovePending: vi.fn(), onToggleRemoveExisting: vi.fn() };
    const view = render(<ProjectFileList label="Source files" {...handlers} {...props} />);
    return { ...view, ...handlers };
};
const status = (container) => container.querySelector('.project-file-status');

describe('ProjectFileList', () => {
    it('says so when there is nothing to list, and keeps its status region in the page', () => {
        const { container } = renderList({ emptyText: 'No source files yet.' });

        expect(screen.getByText('No source files yet.')).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
        // A live region has to exist before it changes for a screen reader to announce the change
        expect(status(container)).toHaveAttribute('aria-live', 'polite');
        expect(status(container)).toBeEmptyDOMElement();
    });

    it('has a default empty text', () => {
        renderList();

        expect(screen.getByText('No files yet.')).toBeInTheDocument();
    });

    it('lists the saved files, then the new ones, with their paths and sizes', () => {
        renderList({ existingFiles: saved, pendingFiles: [picked(7, 'game/src/game.py', 'x'.repeat(684))] });

        const items = within(screen.getByRole('list', { name: 'Source files' })).getAllByRole('listitem');
        expect(items).toHaveLength(3);
        expect(items[0]).toHaveTextContent('src/main.py');
        expect(items[0]).toHaveTextContent(formatFileSize(1200));
        expect(items[1]).toHaveTextContent('src/utils.py');
        expect(items[1]).toHaveTextContent(formatFileSize(300));
        expect(items[2]).toHaveTextContent('game/src/game.py');
        expect(items[2]).toHaveTextContent(formatFileSize(684));
        expect(within(items[2]).getByText('New')).toBeInTheDocument();
        expect(within(items[0]).queryByText('New')).not.toBeInTheDocument();
    });

    it('marks a saved file for removal, and offers to keep it again', async () => {
        const user = userEvent.setup();
        const { rerender, container, onRemovePending, onToggleRemoveExisting } = renderList({ existingFiles: saved });

        await user.click(screen.getByRole('button', { name: 'Remove src/main.py' }));
        expect(onToggleRemoveExisting).toHaveBeenCalledWith(1);

        rerender(
            <ProjectFileList
                label="Source files"
                existingFiles={saved}
                removedFileIds={new Set([1])}
                onRemovePending={onRemovePending}
                onToggleRemoveExisting={onToggleRemoveExisting}
            />
        );
        const removed = screen.getByText('src/main.py').closest('li');
        expect(removed).toHaveClass('removed');
        expect(within(removed).getByText('Removed on save')).toBeInTheDocument();
        expect(status(container)).toHaveTextContent('1 file will be removed when you save.');

        await user.click(screen.getByRole('button', { name: 'Undo removing src/main.py' }));
        expect(onToggleRemoveExisting).toHaveBeenLastCalledWith(1);
        expect(onRemovePending).not.toHaveBeenCalled();
    });

    it('drops a new file by its local id', async () => {
        const user = userEvent.setup();
        const { onRemovePending, onToggleRemoveExisting } = renderList({ pendingFiles: [picked(7, 'main.py'), picked(8, 'util.py')] });

        await user.click(screen.getByRole('button', { name: 'Remove new file util.py' }));

        expect(onRemovePending).toHaveBeenCalledWith(8);
        expect(onToggleRemoveExisting).not.toHaveBeenCalled();
    });

    it('tells which saved file a new upload of the same path replaces', () => {
        renderList({ existingFiles: saved, pendingFiles: [picked(7, 'src/main.py')] });

        const savedItem = screen.getByRole('button', { name: 'Remove src/main.py' }).closest('li');
        expect(within(savedItem).getByText('Replaced on save')).toBeInTheDocument();
        const otherItem = screen.getByRole('button', { name: 'Remove src/utils.py' }).closest('li');
        expect(within(otherItem).queryByText('Replaced on save')).not.toBeInTheDocument();
    });

    it('shows a saved file that is being removed as removed, not replaced', () => {
        renderList({ existingFiles: saved, pendingFiles: [picked(7, 'src/main.py')], removedFileIds: new Set([1]) });

        const savedItem = screen.getByRole('button', { name: 'Undo removing src/main.py' }).closest('li');
        expect(within(savedItem).getByText('Removed on save')).toBeInTheDocument();
        expect(within(savedItem).queryByText('Replaced on save')).not.toBeInTheDocument();
    });

    it.each([
        [[picked(7, 'a.py')], new Set(), '1 new file will be uploaded when you save.'],
        [[picked(7, 'a.py'), picked(8, 'b.py')], new Set([1]), '2 new files will be uploaded and 1 file will be removed when you save.'],
        [[], new Set([1, 2]), '2 files will be removed when you save.'],
    ])('says what the next save will do', (pendingFiles, removedFileIds, expected) => {
        const { container } = renderList({ existingFiles: saved, pendingFiles, removedFileIds });

        expect(status(container)).toHaveTextContent(expected);
    });
});
