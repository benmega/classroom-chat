import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';
import { showConfirm } from '../../utils/confirm';

// Opens a confirmation the way the app does and returns the promise that settles with the answer.
const ask = (message = 'Really?', options = {}) => {
    let answer;
    act(() => {
        answer = showConfirm(message, options);
    });
    return answer;
};

describe('ConfirmDialog', () => {
    it('renders nothing until a confirmation is requested', () => {
        render(<ConfirmDialog />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('is a modal dialog named by its title and shows the message and custom button labels', async () => {
        render(<ConfirmDialog />);

        ask('Remove @sam for good?', { title: 'Remove User', confirmText: 'Remove', cancelText: 'Keep' });

        const dialog = await screen.findByRole('dialog', { name: 'Remove User' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveTextContent('Remove @sam for good?');
        expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });

    it('falls back to a generic title and Confirm / Cancel labels', async () => {
        render(<ConfirmDialog />);

        ask();

        expect(await screen.findByRole('dialog', { name: 'Are you sure?' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('resolves true on Confirm and false on Cancel', async () => {
        const user = userEvent.setup();
        render(<ConfirmDialog />);

        const confirmed = ask();
        await user.click(await screen.findByRole('button', { name: 'Confirm' }));
        await expect(confirmed).resolves.toBe(true);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        const cancelled = ask();
        await user.click(await screen.findByRole('button', { name: 'Cancel' }));
        await expect(cancelled).resolves.toBe(false);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resolves false when the backdrop is clicked, but not when the dialog box is', async () => {
        const user = userEvent.setup();
        render(<ConfirmDialog />);

        const answer = ask('Sure?');
        const dialog = await screen.findByRole('dialog');
        await user.click(screen.getByText('Sure?'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(dialog);

        await expect(answer).resolves.toBe(false);
    });

    describe('keyboard', () => {
        it('resolves false on Escape', async () => {
            const user = userEvent.setup();
            render(<ConfirmDialog />);

            const answer = ask();
            await screen.findByRole('dialog');
            await user.keyboard('{Escape}');

            await expect(answer).resolves.toBe(false);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('starts on Confirm for an ordinary question', async () => {
            render(<ConfirmDialog />);

            ask('Pass this chapter?');

            expect(await screen.findByRole('button', { name: 'Confirm' })).toHaveFocus();
        });

        it('starts on Cancel for a destructive one, so a stray Enter cannot delete anything', async () => {
            const user = userEvent.setup();
            render(<ConfirmDialog />);

            const answer = ask('Delete it?', { destructive: true, confirmText: 'Delete' });
            expect(await screen.findByRole('button', { name: 'Cancel' })).toHaveFocus();
            expect(screen.getByRole('button', { name: 'Delete' })).not.toHaveFocus();

            await user.keyboard('{Enter}');

            await expect(answer).resolves.toBe(false);
        });

        it('confirms a destructive question with Tab then Enter', async () => {
            const user = userEvent.setup();
            render(<ConfirmDialog />);

            const answer = ask('Delete it?', { destructive: true, confirmText: 'Delete' });
            await screen.findByRole('dialog');
            await user.tab();
            expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
            await user.keyboard('{Enter}');

            await expect(answer).resolves.toBe(true);
        });

        it('keeps Tab and Shift+Tab inside the dialog', async () => {
            const user = userEvent.setup();
            render(<ConfirmDialog />);

            ask();
            const confirm = await screen.findByRole('button', { name: 'Confirm' });
            const cancel = screen.getByRole('button', { name: 'Cancel' });
            expect(confirm).toHaveFocus();

            await user.tab();
            expect(cancel).toHaveFocus();
            await user.tab({ shift: true });
            expect(confirm).toHaveFocus();
            await user.tab({ shift: true });
            expect(cancel).toHaveFocus();
        });

        it('returns focus to the button that raised it once it is answered', async () => {
            const user = userEvent.setup();
            const Page = () => {
                const [answer, setAnswer] = useState('');
                return (
                    <>
                        <button onClick={async () => setAnswer(String(await showConfirm('Delete?', { destructive: true })))}>
                            Delete row
                        </button>
                        <output>{answer}</output>
                        <ConfirmDialog />
                    </>
                );
            };
            render(<Page />);
            const opener = screen.getByRole('button', { name: 'Delete row' });

            await user.click(opener);
            expect(await screen.findByRole('dialog')).toBeInTheDocument();
            expect(opener).not.toHaveFocus();
            await user.keyboard('{Escape}');

            expect(await screen.findByText('false')).toBeInTheDocument();
            expect(opener).toHaveFocus();
        });
    });

    describe('opened over a Modal', () => {
        // A confirmation raised from a form in a Modal (e.g. the drawer-conflict question).
        const ModalWithConfirm = ({ onClose, onAnswer }) => (
            <>
                <Modal isOpen onClose={onClose} title="Set drawer">
                    <button onClick={async () => onAnswer(await showConfirm('Take it over?', { destructive: true }))}>Save drawer</button>
                </Modal>
                <ConfirmDialog />
            </>
        );

        it('closes only the confirmation on Escape, and leaves the Modal open', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            const onAnswer = vi.fn();
            render(<ModalWithConfirm onClose={onClose} onAnswer={onAnswer} />);

            await user.click(screen.getByRole('button', { name: 'Save drawer' }));
            await screen.findByRole('dialog', { name: 'Are you sure?' });
            await user.keyboard('{Escape}');

            expect(onAnswer).toHaveBeenCalledWith(false);
            expect(onClose).not.toHaveBeenCalled();
            expect(screen.getByRole('dialog', { name: 'Set drawer' })).toBeInTheDocument();
        });

        it('hands Escape back to the Modal once the confirmation is gone', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            render(<ModalWithConfirm onClose={onClose} onAnswer={vi.fn()} />);

            await user.click(screen.getByRole('button', { name: 'Save drawer' }));
            await screen.findByRole('dialog', { name: 'Are you sure?' });
            await user.keyboard('{Escape}');
            expect(onClose).not.toHaveBeenCalled();

            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not let Tab leave the confirmation for the Modal underneath', async () => {
            const user = userEvent.setup();
            render(<ModalWithConfirm onClose={vi.fn()} onAnswer={vi.fn()} />);

            await user.click(screen.getByRole('button', { name: 'Save drawer' }));
            const cancel = await screen.findByRole('button', { name: 'Cancel' });
            expect(cancel).toHaveFocus();

            await user.tab();
            await user.tab();

            expect(cancel).toHaveFocus();
        });
    });
});
