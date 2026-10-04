import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddChildModal from './AddChildModal';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: { post: vi.fn() },
}));

const renderModal = (props = {}) => {
    const handlers = { onClose: vi.fn(), onAdded: vi.fn() };
    const utils = render(<AddChildModal isOpen {...handlers} {...props} />);
    return { ...utils, ...handlers };
};

describe('AddChildModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing while closed', () => {
        renderModal({ isOpen: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    describe('semantics', () => {
        it('is a modal dialog named by its heading', () => {
            renderModal();

            const dialog = screen.getByRole('dialog', { name: 'Connect Your Child' });
            expect(dialog).toHaveAttribute('aria-modal', 'true');
        });

        it('does not hide the form inside a button role', () => {
            renderModal();

            expect(screen.getByRole('textbox')).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Connect Your Child' })).toBeInTheDocument();
            expect(document.querySelector('.modal-overlay')).toHaveAttribute('role', 'presentation');
            expect(screen.getAllByRole('button').map((b) => b.textContent || b.getAttribute('aria-label'))).toEqual(['Close', 'Connect']);
        });

        it('names the close button', () => {
            const { onClose } = renderModal();

            fireEvent.click(screen.getByRole('button', { name: 'Close' }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('closing', () => {
        it('closes on Escape', async () => {
            const user = userEvent.setup();
            const { onClose } = renderModal();

            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('closes when the backdrop is clicked, but not when the dialog is', () => {
            const { onClose } = renderModal();

            fireEvent.click(screen.getByRole('dialog'));
            fireEvent.click(screen.getByRole('heading', { name: 'Connect Your Child' }));
            expect(onClose).not.toHaveBeenCalled();

            fireEvent.click(document.querySelector('.modal-overlay'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('focus', () => {
        it('starts on the close button and keeps Tab inside the dialog', async () => {
            const user = userEvent.setup();
            renderModal();
            const close = screen.getByRole('button', { name: 'Close' });
            expect(close).toHaveFocus();

            await user.tab();
            expect(screen.getByRole('textbox')).toHaveFocus();
            await user.type(screen.getByRole('textbox'), 'ABC123');
            await user.tab();
            expect(screen.getByRole('button', { name: 'Connect' })).toHaveFocus();
            await user.tab();
            expect(close).toHaveFocus();
        });

        it('returns focus to the control that opened it', () => {
            const opener = document.createElement('button');
            document.body.appendChild(opener);
            opener.focus();
            const { rerender, onClose, onAdded } = renderModal();
            expect(opener).not.toHaveFocus();

            rerender(<AddChildModal isOpen={false} onClose={onClose} onAdded={onAdded} />);

            expect(opener).toHaveFocus();
            opener.remove();
        });
    });

    describe('connecting', () => {
        it('only enables Connect once a code is typed', () => {
            renderModal();
            const connect = screen.getByRole('button', { name: 'Connect' });
            expect(connect).toBeDisabled();

            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ABC123' } });

            expect(connect).toBeEnabled();
        });

        it('links the child and closes', async () => {
            client.post.mockResolvedValueOnce({ data: {} });
            const { onAdded, onClose } = renderModal();

            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ABC123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

            await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
            expect(client.post).toHaveBeenCalledWith('/api/parents/connect/code', { code: 'ABC123' });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('shows the server message and stays open when the code is rejected', async () => {
            client.post.mockRejectedValueOnce({ response: { data: { message: 'Code has expired.' } } });
            const { onAdded, onClose } = renderModal();

            fireEvent.change(screen.getByRole('textbox'), { target: { value: 'OLD123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

            expect(await screen.findByText('Code has expired.')).toBeInTheDocument();
            expect(onAdded).not.toHaveBeenCalled();
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
