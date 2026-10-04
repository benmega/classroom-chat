import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Modal from './Modal';

const renderModal = (props = {}, children = <button>Save</button>) => render(
    <Modal isOpen onClose={vi.fn()} title="Edit user" {...props}>
        {children}
    </Modal>
);

describe('Modal', () => {
    afterEach(() => {
        document.body.style.overflow = '';
    });

    it('renders nothing while closed', () => {
        render(<Modal isOpen={false} onClose={vi.fn()} title="Edit user">Body</Modal>);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    describe('labelling', () => {
        it('is a modal dialog named by its title', () => {
            renderModal();

            const dialog = screen.getByRole('dialog', { name: 'Edit user' });
            expect(dialog).toHaveAttribute('aria-modal', 'true');
            expect(screen.getByRole('heading', { name: 'Edit user' }).id).toBe(dialog.getAttribute('aria-labelledby'));
        });

        it('uses ariaLabel when there is no title', () => {
            renderModal({ title: '', ariaLabel: 'Join a classroom' });

            const dialog = screen.getByRole('dialog', { name: 'Join a classroom' });
            expect(dialog).not.toHaveAttribute('aria-labelledby');
        });

        it('does not point aria-labelledby at a missing element when there is no title', () => {
            renderModal({ title: undefined });

            const dialog = screen.getByRole('dialog');
            expect(dialog).not.toHaveAttribute('aria-labelledby');
            expect(dialog).not.toHaveAttribute('aria-label');
        });

        it('prefers the title over ariaLabel', () => {
            renderModal({ ariaLabel: 'Something else' });

            const dialog = screen.getByRole('dialog', { name: 'Edit user' });
            expect(dialog).not.toHaveAttribute('aria-label');
        });

        it('gives two modals that are open together their own title ids and names', () => {
            render(
                <>
                    <Modal isOpen onClose={vi.fn()} title="Submit progress">Form</Modal>
                    <Modal isOpen onClose={vi.fn()} title="Who helped you?">Search</Modal>
                </>
            );

            const [first, second] = screen.getAllByRole('dialog');
            expect(first.getAttribute('aria-labelledby')).not.toBe(second.getAttribute('aria-labelledby'));
            expect(screen.getByRole('dialog', { name: 'Submit progress' })).toBe(first);
            expect(screen.getByRole('dialog', { name: 'Who helped you?' })).toBe(second);
            const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('applies maxWidth', () => {
            renderModal({ maxWidth: '500px' });

            expect(screen.getByRole('dialog').style.maxWidth).toBe('500px');
        });

        it('adds bodyClassName to the body and keeps the plain body otherwise', () => {
            const { rerender } = renderModal({ bodyClassName: 'flush' });
            expect(document.querySelector('.modal-body')).toHaveClass('modal-body', 'flush');

            rerender(<Modal isOpen onClose={vi.fn()} title="Edit user"><button>Save</button></Modal>);
            expect(document.querySelector('.modal-body').className).toBe('modal-body');
        });
    });

    describe('closing', () => {
        it('closes with the close button, with or without a title', () => {
            const onClose = vi.fn();
            const { rerender } = renderModal({ onClose });

            fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
            rerender(<Modal isOpen onClose={onClose}>Body</Modal>);
            fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

            expect(onClose).toHaveBeenCalledTimes(2);
        });

        it('closes on Escape', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            renderModal({ onClose });

            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('closes when the backdrop is clicked, but not when the dialog is', () => {
            const onClose = vi.fn();
            renderModal({ onClose });

            fireEvent.click(screen.getByRole('button', { name: 'Save' }));
            fireEvent.click(screen.getByRole('dialog'));
            expect(onClose).not.toHaveBeenCalled();

            fireEvent.click(document.querySelector('.admin-modal-overlay'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('lets only the innermost of two stacked modals close on Escape', async () => {
            const user = userEvent.setup();
            const closeOuter = vi.fn();
            const closeInner = vi.fn();
            render(
                <>
                    <Modal isOpen onClose={closeOuter} title="Outer">Outer body</Modal>
                    <Modal isOpen onClose={closeInner} title="Inner">Inner body</Modal>
                </>
            );

            await user.keyboard('{Escape}');

            expect(closeInner).toHaveBeenCalledTimes(1);
            expect(closeOuter).not.toHaveBeenCalled();
        });
    });

    describe('focus', () => {
        it('moves focus to the first control when it opens', () => {
            renderModal();

            expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
        });

        it('still starts on the close button when there is no title and no other control', () => {
            renderModal({ title: '' }, <p>Only text</p>);

            expect(screen.getByRole('button', { name: 'Close modal' })).toHaveFocus();
        });

        it('returns focus to the button that opened it', () => {
            const Page = ({ open }) => (
                <>
                    <button>Open dialog</button>
                    <Modal isOpen={open} onClose={vi.fn()} title="Edit user"><button>Save</button></Modal>
                </>
            );
            const { rerender } = render(<Page open={false} />);
            const opener = screen.getByRole('button', { name: 'Open dialog' });
            opener.focus();

            rerender(<Page open />);
            expect(opener).not.toHaveFocus();
            rerender(<Page open={false} />);

            expect(opener).toHaveFocus();
        });

        it('starts on the control marked data-autofocus, e.g. Cancel in a destructive dialog', () => {
            renderModal({}, (
                <>
                    <button data-autofocus>Cancel</button>
                    <button>Delete everything</button>
                </>
            ));

            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
        });

        it('returns focus to the opener after a data-autofocus start', () => {
            const Page = ({ open }) => (
                <>
                    <button>Open dialog</button>
                    <Modal isOpen={open} onClose={vi.fn()} title="Purge">
                        <button data-autofocus>Cancel</button>
                    </Modal>
                </>
            );
            const { rerender } = render(<Page open={false} />);
            const opener = screen.getByRole('button', { name: 'Open dialog' });
            opener.focus();

            rerender(<Page open />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
            rerender(<Page open={false} />);

            expect(opener).toHaveFocus();
        });

        it('keeps Tab and Shift+Tab inside the dialog', async () => {
            const user = userEvent.setup();
            renderModal({}, (
                <>
                    <button>Save</button>
                    <button>Cancel</button>
                </>
            ));
            const close = screen.getByRole('button', { name: 'Close modal' });
            const cancel = screen.getByRole('button', { name: 'Cancel' });
            expect(close).toHaveFocus();

            await user.tab({ shift: true });
            expect(cancel).toHaveFocus();
            await user.tab();
            expect(close).toHaveFocus();
        });

        it('leaves out disabled controls when finding the ends of the trap', async () => {
            const user = userEvent.setup();
            renderModal({}, (
                <>
                    <button>Save</button>
                    <button disabled>Delete</button>
                </>
            ));
            const close = screen.getByRole('button', { name: 'Close modal' });
            screen.getByRole('button', { name: 'Save' }).focus();

            await user.tab();

            expect(close).toHaveFocus();
        });
    });

    describe('page scroll', () => {
        it('is locked while open and restored when closed', () => {
            document.body.style.overflow = 'auto';
            const { rerender } = renderModal();
            expect(document.body.style.overflow).toBe('hidden');

            rerender(<Modal isOpen={false} onClose={vi.fn()} title="Edit user">Body</Modal>);

            expect(document.body.style.overflow).toBe('auto');
        });
    });
});
