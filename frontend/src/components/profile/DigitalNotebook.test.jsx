import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DigitalNotebook from './DigitalNotebook';

vi.mock('./CameraModal', () => ({
    default: ({ isOpen, onClose, onCapture }) => (isOpen ? (
        <div data-testid="camera-modal">
            <button onClick={() => onCapture('captured-file')}>Capture</button>
            <button onClick={onClose}>Close camera</button>
        </div>
    ) : null),
}));

const notes = [
    { id: 11, url: '/notes/a.png' },
    { id: 12, url: '/notes/b.png' },
];

const renderNotebook = (props = {}) => {
    const handlers = {
        onFileUpload: vi.fn(),
        onDeleteNote: vi.fn(),
        setSlideshowIndex: vi.fn(),
    };
    const utils = render(
        <DigitalNotebook
            notes={notes}
            isOwner={false}
            fileInputRef={React.createRef()}
            cameraInputRef={React.createRef()}
            {...handlers}
            {...props}
        />
    );
    return { ...utils, ...handlers };
};

describe('DigitalNotebook', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders nothing for a visitor when there are no notes', () => {
        const { container } = renderNotebook({ notes: [] });

        expect(container).toBeEmptyDOMElement();
    });

    describe('note thumbnails', () => {
        it('are buttons named by their position that open the slideshow', () => {
            const { setSlideshowIndex } = renderNotebook();

            fireEvent.click(screen.getByRole('button', { name: 'View note 2' }));

            expect(setSlideshowIndex).toHaveBeenCalledWith(1);
        });

        it('keep the picture decorative, since the button carries the name', () => {
            renderNotebook();

            const images = document.querySelectorAll('.note-thumb-btn img');
            expect(images).toHaveLength(2);
            images.forEach((img) => expect(img).toHaveAttribute('alt', ''));
            expect(screen.queryByRole('img', { name: 'Note' })).not.toBeInTheDocument();
        });

        it('can be reached with Tab and opened with Enter or Space', async () => {
            const user = userEvent.setup();
            const { setSlideshowIndex } = renderNotebook();

            await user.tab();
            expect(screen.getByRole('button', { name: 'View note 1' })).toHaveFocus();
            await user.keyboard('{Enter}');
            await user.tab();
            expect(screen.getByRole('button', { name: 'View note 2' })).toHaveFocus();
            await user.keyboard(' ');

            expect(setSlideshowIndex).toHaveBeenNthCalledWith(1, 0);
            expect(setSlideshowIndex).toHaveBeenNthCalledWith(2, 1);
        });

        it('are not placed on the image itself', () => {
            renderNotebook();

            document.querySelectorAll('.note-item img').forEach((img) => {
                expect(img).not.toHaveAttribute('role');
                expect(img).not.toHaveAttribute('tabindex');
            });
        });
    });

    describe('owner controls', () => {
        it('names the delete buttons by note and deletes the right one', () => {
            const { onDeleteNote } = renderNotebook({ isOwner: true });

            fireEvent.click(screen.getByRole('button', { name: 'Delete note 2' }));

            expect(onDeleteNote).toHaveBeenCalledWith(12);
            expect(screen.getByRole('button', { name: 'Delete note 1' })).toBeInTheDocument();
        });

        it('shows no delete buttons to visitors', () => {
            renderNotebook();

            expect(screen.queryByRole('button', { name: /Delete note/ })).not.toBeInTheDocument();
        });

        it('names the scan button and opens the camera on desktop', () => {
            const { onFileUpload } = renderNotebook({ isOwner: true });

            fireEvent.click(screen.getByRole('button', { name: 'Scan note' }));
            expect(screen.getByTestId('camera-modal')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Capture'));
            expect(onFileUpload).toHaveBeenCalledWith({ target: { files: ['captured-file'] } }, 'camera');

            fireEvent.click(screen.getByText('Close camera'));
            expect(screen.queryByTestId('camera-modal')).not.toBeInTheDocument();
        });

        it('names the scan control as a label for the camera input on phones', () => {
            vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14) Mobile');
            renderNotebook({ isOwner: true });

            expect(screen.queryByRole('button', { name: 'Scan note' })).not.toBeInTheDocument();
            const scan = document.querySelector('label[for="camera-upload-input"]');
            expect(scan).toHaveAttribute('aria-label', 'Scan note');
            expect(screen.getByLabelText('Scan note', { selector: 'input' })).toHaveAttribute('capture');
        });

        it('names the upload control and its file input', () => {
            const { onFileUpload } = renderNotebook({ isOwner: true });

            const upload = document.querySelector('label[for="file-upload-input"]');
            expect(upload).toHaveAttribute('aria-label', 'Upload note');
            const input = screen.getByLabelText('Upload note', { selector: 'input' });
            expect(input).toHaveAttribute('type', 'file');

            fireEvent.change(input, { target: { files: [new File(['x'], 'note.png', { type: 'image/png' })] } });
            expect(onFileUpload).toHaveBeenCalledWith(expect.anything(), 'upload');
        });

        it('keeps the file inputs focusable (visually hidden, not display:none)', () => {
            renderNotebook({ isOwner: true });

            ['camera-upload-input', 'file-upload-input'].forEach((id) => {
                const input = document.getElementById(id);
                expect(input).not.toHaveAttribute('hidden');
                expect(input.style.position).toBe('absolute');
                expect(input.style.display).not.toBe('none');
            });
        });
    });
});
