import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitProgressModal from './SubmitProgressModal';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';

vi.mock('../../api/client', () => ({
    default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const CERT_URL = 'https://codecombat.com/certificates/abc123?course=cs1';
const mockCheckAuth = vi.fn();

const renderModal = (props = {}) => render(<SubmitProgressModal isOpen onClose={vi.fn()} {...props} />);
const typeUrl = (value) => fireEvent.change(document.getElementById('url'), { target: { value } });
const submit = () => fireEvent.submit(document.querySelector('form.challenge-form'));

describe('SubmitProgressModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({ checkAuth: mockCheckAuth });
    });

    it('renders nothing when closed', () => {
        const { container } = render(<SubmitProgressModal isOpen={false} onClose={vi.fn()} />);

        expect(container).toBeEmptyDOMElement();
    });

    describe('challenge submissions', () => {
        it('posts the url and helper, then resets and closes on success', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true, duck_reward: 5, new_awards: [{ name: 'First Steps' }] } });
            const onClose = vi.fn();
            renderModal({ onClose });

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(onClose).toHaveBeenCalled());
            expect(client.post).toHaveBeenCalledWith(
                '/challenge/submit',
                { url: 'https://codecombat.com/play/level/x', helpers: '' },
                expect.any(Object)
            );
            expect(mockCheckAuth).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: First Steps!', expect.any(Object));
            expect(document.getElementById('url').value).toBe('');
        });

        it('shows the message of an unsuccessful response and clears the url', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false, message: 'You already claimed this level.' } });
            renderModal();

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You already claimed this level.'));
            expect(document.getElementById('url').value).toBe('');
        });

        it('reads an error field in the same unsuccessful response', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false, error: 'Level not recognised.' } });
            renderModal();

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Level not recognised.'));
        });

        it('falls back to a generic message when an unsuccessful response carries no text', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false } });
            renderModal();

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Submission failed.'));
        });

        it('shows the text of a failed request', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            client.post.mockRejectedValueOnce({ response: { data: { status: 'error', data: null, error: 'Too many submissions.' } } });
            renderModal();

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Too many submissions.'));
        });

        it('uses a generic message when the failure has no text', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            client.post.mockRejectedValueOnce(new Error('Network Error'));
            renderModal();

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('An error occurred during submission.'));
        });

        it('tells the user their teacher was asked when the course is not connected', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const onClose = vi.fn();
            client.post.mockRejectedValueOnce({
                response: { data: { course_instance_not_found: true, message: 'We asked your teacher to add this course.' } },
            });
            renderModal({ onClose });

            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(toast.success).toHaveBeenCalledWith('We asked your teacher to add this course.'));
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('certificate submissions', () => {
        it('posts the certificate and closes on success', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const onClose = vi.fn();
            renderModal({ onClose });

            typeUrl(CERT_URL);
            expect(await screen.findByText('Please upload the certificate PDF')).toBeInTheDocument();
            submit();

            await waitFor(() => expect(onClose).toHaveBeenCalled());
            expect(client.post).toHaveBeenCalledWith('/api/achievements/submit_certificate', expect.any(FormData), expect.any(Object));
        });

        it('shows the error of an unsuccessful certificate response', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false, error: 'Certificate already submitted.' } });
            renderModal();

            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Certificate already submitted.'));
        });

        it('reads a message field in an unsuccessful certificate response too', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false, message: 'Certificate is not valid.' } });
            renderModal();

            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Certificate is not valid.'));
        });

        it('falls back to a generic message when an unsuccessful certificate response carries no text', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false } });
            renderModal();

            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Submission failed.'));
        });
    });
});
