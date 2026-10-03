import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import NoteSlideshow from './NoteSlideshow';

const notes = [
    { id: 1, url: '/notes/one.png' },
    { id: 2, url: '/notes/two.png' },
];

const renderSlideshow = (props = {}) => {
    const handlers = { onClose: vi.fn(), onPrev: vi.fn(), onNext: vi.fn() };
    const utils = render(<NoteSlideshow notes={notes} currentIndex={0} {...handlers} {...props} />);
    return { ...utils, ...handlers };
};

describe('NoteSlideshow', () => {
    it.each([
        ['no note is selected', null],
        ['the index points at no note', 5],
    ])('renders nothing when %s', (_, currentIndex) => {
        renderSlideshow({ currentIndex });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('is a modal dialog named "Note viewer" that shows the current note', () => {
        renderSlideshow({ currentIndex: 1 });

        const dialog = screen.getByRole('dialog', { name: 'Note viewer' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(screen.getByRole('img', { name: 'Note full view' })).toHaveAttribute('src', '/notes/two.png');
    });

    it('does not hide its controls inside a button role', () => {
        renderSlideshow();

        expect(screen.getByRole('button', { name: 'Close slideshow' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Previous note' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next note' })).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    describe('mouse', () => {
        it('closes from the close button', () => {
            const { onClose } = renderSlideshow();

            fireEvent.click(screen.getByRole('button', { name: 'Close slideshow' }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('steps with the arrow buttons without closing', () => {
            const { onClose, onPrev, onNext } = renderSlideshow();

            fireEvent.click(screen.getByRole('button', { name: 'Previous note' }));
            fireEvent.click(screen.getByRole('button', { name: 'Next note' }));

            expect(onPrev).toHaveBeenCalledTimes(1);
            expect(onNext).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();
        });

        it('closes when the dark backdrop is clicked, but not when the picture is', () => {
            const { onClose } = renderSlideshow();

            fireEvent.click(screen.getByRole('img', { name: 'Note full view' }));
            fireEvent.click(document.querySelector('.slide-content'));
            expect(onClose).not.toHaveBeenCalled();

            fireEvent.click(screen.getByRole('dialog'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('keyboard', () => {
        it('closes on Escape', async () => {
            const user = userEvent.setup();
            const { onClose } = renderSlideshow();

            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('steps with the left and right arrow keys', async () => {
            const user = userEvent.setup();
            const { onPrev, onNext } = renderSlideshow();

            await user.keyboard('{ArrowRight}');
            expect(onNext).toHaveBeenCalledTimes(1);
            expect(onPrev).not.toHaveBeenCalled();

            await user.keyboard('{ArrowLeft}');
            expect(onPrev).toHaveBeenCalledTimes(1);
        });

        it('ignores other keys', async () => {
            const user = userEvent.setup();
            const { onPrev, onNext, onClose } = renderSlideshow();

            await user.keyboard('{ArrowUp}{ArrowDown}a');

            expect(onPrev).not.toHaveBeenCalled();
            expect(onNext).not.toHaveBeenCalled();
            expect(onClose).not.toHaveBeenCalled();
        });

        it('moves focus to the dialog and keeps Tab inside it', async () => {
            const user = userEvent.setup();
            renderSlideshow();
            const close = screen.getByRole('button', { name: 'Close slideshow' });
            const next = screen.getByRole('button', { name: 'Next note' });
            expect(close).toHaveFocus();

            await user.tab({ shift: true });
            expect(next).toHaveFocus();
            await user.tab();
            expect(close).toHaveFocus();
        });

        it('gives focus back to the thumbnail that opened it', () => {
            const thumb = document.createElement('button');
            document.body.appendChild(thumb);
            thumb.focus();
            const { rerender } = renderSlideshow();
            expect(thumb).not.toHaveFocus();

            rerender(<NoteSlideshow notes={notes} currentIndex={null} onClose={vi.fn()} onPrev={vi.fn()} onNext={vi.fn()} />);

            expect(thumb).toHaveFocus();
            thumb.remove();
        });

        it('keeps focus in place while stepping from note to note', () => {
            const { rerender, onClose, onPrev, onNext } = renderSlideshow();
            const next = screen.getByRole('button', { name: 'Next note' });
            next.focus();

            rerender(<NoteSlideshow notes={notes} currentIndex={1} onClose={onClose} onPrev={onPrev} onNext={onNext} />);

            expect(next).toHaveFocus();
            expect(screen.getByRole('img', { name: 'Note full view' })).toHaveAttribute('src', '/notes/two.png');
        });
    });
});
