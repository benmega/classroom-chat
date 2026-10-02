import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitProgressModal from './SubmitProgressModal';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import confetti from 'canvas-confetti';

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

        it.each([
            [400, 'Invalid certificate URL.'],
            [400, 'Invalid file type. Only PDF is allowed.'],
            [422, 'No matching achievement found for this course.'],
        ])('shows the server message of a %i rejection and keeps the form filled in', async (status, error) => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            client.post.mockRejectedValueOnce({ response: { status, data: { success: false, error } } });
            const onClose = vi.fn();
            renderModal({ onClose });

            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith(error));
            expect(document.getElementById('url').value).toBe(CERT_URL);
            expect(screen.getByText('Please upload the certificate PDF')).toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();
        });

        it('clears the url after a server failure', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            client.post.mockRejectedValueOnce({ response: { status: 500, data: { success: false, error: 'Failed to generate certificate: boom' } } });
            renderModal();

            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to generate certificate: boom'));
            await waitFor(() => expect(document.getElementById('url').value).toBe(''));
        });
    });

    describe('recognising a certificate link', () => {
        const uploadField = () => document.getElementById('certificate-file');

        it.each([
            ['a CodeCombat certificate', 'https://codecombat.com/certificates/abc123?course=cs1'],
            ['a CodeCombat certificate on www', 'https://www.codecombat.com/certificates/abc123?course=cs1'],
            ['an Ozaria certificate', 'https://ozaria.com/certificates/Xy9?course=chapter-1'],
            ['other query parameters around the course', 'https://codecombat.com/certificates/abc123?foo=1&course=cs-2&bar=2'],
        ])('asks for the certificate PDF for %s', async (_name, link) => {
            renderModal();

            typeUrl(link);

            expect(await screen.findByText('Please upload the certificate PDF')).toBeInTheDocument();
            expect(uploadField()).toBeRequired();
            expect(uploadField()).toHaveAttribute('accept', '.pdf');
        });

        it.each([
            ['a level link', 'https://codecombat.com/play/level/dungeons-of-kithgard'],
            ['an insecure link', 'http://codecombat.com/certificates/abc123?course=cs1'],
            ['a certificate link without a course', 'https://codecombat.com/certificates/abc123'],
            ['another site', 'https://example.com/certificates/abc123?course=cs1'],
            ['a look-alike host', 'https://codecombat.com.evil.example/certificates/abc123?course=cs1'],
            ['a look-alike name', 'https://notcodecombat.com/certificates/abc123?course=cs1'],
            ['nothing yet', ''],
        ])('does not ask for a PDF for %s', async (_name, link) => {
            renderModal();

            typeUrl(link);

            await waitFor(() => expect(document.getElementById('url')).toHaveValue(link));
            expect(uploadField()).toBeNull();
            expect(screen.queryByText('Please upload the certificate PDF')).not.toBeInTheDocument();
        });

        it('stops asking for the PDF, and forgets the chosen file, when the link is changed to something else', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            renderModal();
            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            fireEvent.change(uploadField(), { target: { files: [new File(['%PDF'], 'old.pdf', { type: 'application/pdf' })] } });

            typeUrl('https://codecombat.com/play/level/x');
            await waitFor(() => expect(uploadField()).toBeNull());
            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            submit();

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            expect(client.post.mock.calls[0][1].has('certificate_file')).toBe(false);
        });

        it('tells its parent about every change of the link', () => {
            const onUrlChange = vi.fn();
            renderModal({ onUrlChange });

            typeUrl('https://codecombat.com/play/level/x');

            expect(onUrlChange).toHaveBeenLastCalledWith('https://codecombat.com/play/level/x');
        });
    });

    describe('submitting a certificate', () => {
        const pdf = () => new File(['%PDF-1.4'], 'certificate.pdf', { type: 'application/pdf' });

        it('sends the link and the PDF as form data', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            renderModal();
            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            fireEvent.change(document.getElementById('certificate-file'), { target: { files: [pdf()] } });

            submit();

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            const [url, body] = client.post.mock.calls[0];
            expect(url).toBe('/api/achievements/submit_certificate');
            expect(body).toBeInstanceOf(FormData);
            expect(body.get('certificate_url')).toBe(CERT_URL);
            expect(body.get('certificate_file').name).toBe('certificate.pdf');
            // A certificate is not a challenge: no helper, no balance refresh
            expect(client.post).not.toHaveBeenCalledWith('/challenge/submit', expect.anything(), expect.anything());
            expect(mockCheckAuth).not.toHaveBeenCalled();
        });

        it('shows how much of the upload is done and that it is uploading', async () => {
            let config;
            let finish;
            client.post.mockImplementationOnce((_url, _body, requestConfig) => {
                config = requestConfig;
                return new Promise((resolve) => { finish = resolve; });
            });
            const onClose = vi.fn();
            renderModal({ onClose });
            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');
            fireEvent.change(document.getElementById('certificate-file'), { target: { files: [pdf()] } });

            submit();

            expect(await screen.findByText('Uploading...')).toBeInTheDocument();
            await act(async () => { config.onUploadProgress({ loaded: 40, total: 160 }); });
            expect(screen.getByText('25% Uploaded')).toBeInTheDocument();
            await act(async () => { config.onUploadProgress({ loaded: 160, total: 160 }); });
            expect(screen.getByText('100% Uploaded')).toBeInTheDocument();
            // An event without a total says nothing about the progress
            await act(async () => { config.onUploadProgress({ loaded: 5 }); });
            expect(screen.getByText('100% Uploaded')).toBeInTheDocument();

            await act(async () => { finish({ data: { success: true } }); });
            await waitFor(() => expect(onClose).toHaveBeenCalled());
        });

        it('celebrates, empties the form and closes once the certificate is accepted', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const onClose = vi.fn();
            renderModal({ onClose });
            typeUrl(CERT_URL);
            await screen.findByText('Please upload the certificate PDF');

            submit();

            await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
            expect(confetti).toHaveBeenCalledTimes(1);
            // The form empties in the renders that follow the close
            await waitFor(() => expect(document.getElementById('url')).toHaveValue(''));
            await waitFor(() => expect(document.getElementById('certificate-file')).toBeNull());
        });
    });

    describe('submitting a challenge', () => {
        it('shows that it is submitting while the request runs', async () => {
            let finish;
            client.post.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
            renderModal();
            typeUrl('https://codecombat.com/play/level/x');

            submit();

            expect(await screen.findByText('Submitting...')).toBeInTheDocument();
            expect(document.getElementById('claim-ducks-submit-btn')).toBeDisabled();
            await act(async () => { finish({ data: { success: false } }); });
            await waitFor(() => expect(screen.queryByText('Submitting...')).not.toBeInTheDocument());
        });

        it('celebrates in proportion to the duck reward, within limits', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true, duck_reward: 5 } });
            renderModal();
            typeUrl('https://codecombat.com/play/level/x');
            submit();
            await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1));
            expect(confetti).toHaveBeenLastCalledWith(expect.objectContaining({ particleCount: 100, spread: 80 }));
        });

        it('celebrates a reward of 10 ducks when the server names none, and never more than 500 particles', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const { unmount } = renderModal();
            typeUrl('https://codecombat.com/play/level/x');
            submit();
            await waitFor(() => expect(confetti).toHaveBeenCalledTimes(1));
            expect(confetti).toHaveBeenLastCalledWith(expect.objectContaining({ particleCount: 150, spread: 90 }));
            unmount();

            client.post.mockResolvedValueOnce({ data: { success: true, duck_reward: 1000 } });
            renderModal();
            typeUrl('https://codecombat.com/play/level/y');
            submit();
            await waitFor(() => expect(confetti).toHaveBeenCalledTimes(2));
            expect(confetti).toHaveBeenLastCalledWith(expect.objectContaining({ particleCount: 500, spread: 160 }));
        });

        it('announces every new achievement', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true, new_awards: [{ name: 'One' }, { name: 'Two' }] } });
            renderModal();
            typeUrl('https://codecombat.com/play/level/x');

            submit();

            await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(2));
            expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: One!', expect.any(Object));
            expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: Two!', expect.any(Object));
        });

        it('uses the server text of a course that is not connected yet, or a default one', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            client.post.mockRejectedValueOnce({ response: { data: { course_instance_not_found: true } } });
            renderModal();
            typeUrl('https://codecombat.com/play/level/x');

            submit();

            await waitFor(() => expect(toast.success).toHaveBeenCalledWith(
                "This course wasn't connected yet, but we've automatically requested your teacher to add it!"
            ));
        });
    });

    describe('tagging a helper', () => {
        const openHelpers = () => fireEvent.click(screen.getByTitle('Tag a helper'));

        beforeEach(() => {
            client.get.mockResolvedValue({ data: { users: [] } });
        });

        it('opens a dialog to pick a classmate, and closing it leaves the popover open', () => {
            const onClose = vi.fn();
            renderModal({ onClose });

            openHelpers();
            expect(screen.getByRole('dialog', { name: 'Who helped you?' })).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();
        });

        it('sends the tagged helper with the challenge and shows who it is', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            renderModal();
            openHelpers();

            fireEvent.change(screen.getByPlaceholderText('Search by username or nickname...'), { target: { value: 'amy' } });
            expect(screen.getByText('amy', { selector: 'strong' })).toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
            expect(screen.getByTitle('Helper: amy')).toBeInTheDocument();
            typeUrl('https://codecombat.com/play/level/x');
            submit();

            await waitFor(() => expect(client.post).toHaveBeenCalledWith(
                '/challenge/submit',
                { url: 'https://codecombat.com/play/level/x', helpers: 'amy' },
                expect.any(Object)
            ));
        });

        it('forgets the helper again with Clear', () => {
            renderModal();
            openHelpers();
            fireEvent.change(screen.getByPlaceholderText('Search by username or nickname...'), { target: { value: 'amy' } });

            fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

            expect(screen.queryByText('amy', { selector: 'strong' })).not.toBeInTheDocument();
        });

        it('closes only the helper dialog on Escape, not the popover under it', () => {
            const onClose = vi.fn();
            renderModal({ onClose });
            openHelpers();

            fireEvent.keyDown(document, { key: 'Escape' });

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();
            expect(document.getElementById('url')).toBeInTheDocument();
        });

        it('does not take a click inside the helper dialog, which sits outside the popover, for a click outside', () => {
            const onClose = vi.fn();
            renderModal({ onClose });
            openHelpers();

            fireEvent.mouseDown(screen.getByRole('dialog'));

            expect(onClose).not.toHaveBeenCalled();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
    });

    describe('closing', () => {
        it('closes on Escape', () => {
            const onClose = vi.fn();
            renderModal({ onClose });

            fireEvent.keyDown(document, { key: 'Escape' });

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('ignores other keys', () => {
            const onClose = vi.fn();
            renderModal({ onClose });

            fireEvent.keyDown(document, { key: 'Enter' });
            fireEvent.keyDown(document, { key: 'a' });

            expect(onClose).not.toHaveBeenCalled();
        });

        it('closes on a click outside the popover', () => {
            const onClose = vi.fn();
            renderModal({ onClose });

            fireEvent.mouseDown(document.body);

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('stays open for a click inside it', () => {
            const onClose = vi.fn();
            renderModal({ onClose });

            fireEvent.mouseDown(document.getElementById('url'));

            expect(onClose).not.toHaveBeenCalled();
        });

        it('stays open for a click on the button that opens it, which toggles it itself', () => {
            const onClose = vi.fn();
            render(
                <>
                    <button id="claim-ducks-btn"><span>Claim ducks</span></button>
                    <SubmitProgressModal isOpen onClose={onClose} />
                </>
            );

            fireEvent.mouseDown(screen.getByText('Claim ducks'));

            expect(onClose).not.toHaveBeenCalled();
        });

        it('listens for nothing while it is closed', () => {
            const onClose = vi.fn();
            render(<SubmitProgressModal isOpen={false} onClose={onClose} />);

            fireEvent.keyDown(document, { key: 'Escape' });
            fireEvent.mouseDown(document.body);

            expect(onClose).not.toHaveBeenCalled();
        });

        it('stops listening once it is closed', () => {
            const onClose = vi.fn();
            const { rerender } = render(<SubmitProgressModal isOpen onClose={onClose} />);

            rerender(<SubmitProgressModal isOpen={false} onClose={onClose} />);
            fireEvent.keyDown(document, { key: 'Escape' });

            expect(onClose).not.toHaveBeenCalled();
        });
    });

});
