import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
