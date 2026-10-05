import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContactTeacherModal from './ContactTeacherModal';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client', () => ({
    default: {
        post: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

describe('ContactTeacherModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders null if not open', () => {
        const { container } = render(<ContactTeacherModal isOpen={false} onClose={vi.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders when open and allows sending message', async () => {
        const onClose = vi.fn();
        client.post.mockResolvedValueOnce({ data: { status: 'success' } });

        render(<ContactTeacherModal isOpen={true} onClose={onClose} />);
        
        expect(screen.getByText('Message the Teacher')).toBeInTheDocument();
        
        const subjectInput = screen.getByLabelText(/Subject/i);
        fireEvent.change(subjectInput, { target: { value: 'Homework' } });
        
        const messageInput = screen.getByLabelText(/Message/i);
        fireEvent.change(messageInput, { target: { value: 'Can you help my child?' } });
        
        const sendBtn = screen.getByRole('button', { name: /Send Message/i });
        fireEvent.click(sendBtn);
        
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/parents/contact-teacher', {
                subject: 'Homework',
                body: 'Can you help my child?'
            });
        });
        
        expect(screen.getByText('Message Sent!')).toBeInTheDocument();
        
        const closeBtns = screen.getAllByRole('button', { name: /Close/i });
        fireEvent.click(closeBtns[1]);
        expect(onClose).toHaveBeenCalled();
    });

    it('shows error toast on failure', async () => {
        const onClose = vi.fn();
        client.post.mockRejectedValueOnce({ response: { data: { error: 'Failed to send' } } });

        render(<ContactTeacherModal isOpen={true} onClose={onClose} />);
        
        const messageInput = screen.getByLabelText(/Message/i);
        fireEvent.change(messageInput, { target: { value: 'Help' } });
        
        const sendBtn = screen.getByRole('button', { name: /Send Message/i });
        fireEvent.click(sendBtn);
        
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to send');
        });
    });

    it('shows the text of an @api_response error envelope', async () => {
        client.post.mockRejectedValueOnce({
            response: { data: { status: 'error', data: null, error: 'No teacher is linked to your account.' } },
        });

        render(<ContactTeacherModal isOpen={true} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Help' } });
        fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('No teacher is linked to your account.');
        });
    });

    it('shows the message field of a failure that has no error field', async () => {
        client.post.mockRejectedValueOnce({
            response: { data: { success: false, message: 'Your teacher is not accepting messages.' } },
        });

        render(<ContactTeacherModal isOpen={true} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Help' } });
        fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Your teacher is not accepting messages.');
        });
    });

    it('falls back to a generic message when the failure has no usable text', async () => {
        client.post.mockRejectedValueOnce(new Error('Network Error'));

        render(<ContactTeacherModal isOpen={true} onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Help' } });
        fireEvent.click(screen.getByRole('button', { name: /Send Message/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to send message.');
        });
    });

    describe('keyboard', () => {
        it('is a modal dialog', () => {
            render(<ContactTeacherModal isOpen={true} onClose={vi.fn()} />);

            expect(screen.getByRole('dialog', { name: 'Contact Teacher' })).toHaveAttribute('aria-modal', 'true');
        });

        it('closes on Escape and discards the draft like Cancel does', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            render(<ContactTeacherModal isOpen={true} onClose={onClose} />);
            await user.type(screen.getByLabelText(/Message/i), 'Half-written note');

            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(screen.getByLabelText(/Message/i)).toHaveValue('');
        });

        it('closes on Escape from the confirmation too', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            render(<ContactTeacherModal isOpen={true} onClose={onClose} />);
            await user.type(screen.getByLabelText(/Message/i), 'Hello');
            await user.click(screen.getByRole('button', { name: /Send Message/i }));
            expect(await screen.findByText('Message Sent!')).toBeInTheDocument();

            await user.keyboard('{Escape}');

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('does not react to Escape while closed', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            render(<ContactTeacherModal isOpen={false} onClose={onClose} />);

            await user.keyboard('{Escape}');

            expect(onClose).not.toHaveBeenCalled();
        });

        it('starts on the subject field and keeps Tab and Shift+Tab inside the dialog', async () => {
            const user = userEvent.setup();
            render(<ContactTeacherModal isOpen={true} onClose={vi.fn()} />);
            const close = screen.getByRole('button', { name: 'Close' });
            const cancel = screen.getByRole('button', { name: 'Cancel' });
            expect(screen.getByLabelText(/Subject/i)).toHaveFocus();

            await user.tab();
            expect(screen.getByLabelText(/Message/i)).toHaveFocus();
            await user.tab();
            // Send Message is disabled until there is text, so the trap skips it.
            expect(cancel).toHaveFocus();
            await user.tab();
            expect(close).toHaveFocus();
            await user.tab({ shift: true });
            expect(cancel).toHaveFocus();
        });

        it('returns focus to the control that opened it', () => {
            const opener = document.createElement('button');
            document.body.appendChild(opener);
            opener.focus();
            const onClose = vi.fn();
            const { rerender } = render(<ContactTeacherModal isOpen={true} onClose={onClose} />);
            expect(opener).not.toHaveFocus();

            rerender(<ContactTeacherModal isOpen={false} onClose={onClose} />);

            expect(opener).toHaveFocus();
            opener.remove();
        });
    });
});
