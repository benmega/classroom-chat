import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitChallenge from './SubmitChallenge';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import confetti from 'canvas-confetti';

vi.mock('../../api/client', () => ({
    default: {
        post: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => {
    const mockToast = vi.fn();
    mockToast.error = vi.fn();
    mockToast.success = vi.fn();
    mockToast.call = vi.fn();
    return { default: mockToast };
});

vi.mock('../../store/useAuthStore', () => ({
    default: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({
    default: vi.fn(),
}));

// Mock UserSearchInput to render a simple text input so we can test it easily
vi.mock('../../components/common/UserSearchInput', () => ({
    default: ({ id, value, onChange, placeholder }) => (
        <input 
            id={id}
            type="text" 
            data-testid="mock-user-search" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder={placeholder}
        />
    )
}));

describe('SubmitChallenge', () => {
    const mockCheckAuth = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.mockReturnValue({
            checkAuth: mockCheckAuth
        });
    });

    it('renders the form with default state', () => {
        render(<SubmitChallenge />);
        expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Challenge/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /\+ Extras/i })).toBeInTheDocument();
    });

    it('toggles optional extras section', () => {
        render(<SubmitChallenge />);
        const extrasBtn = screen.getByRole('button', { name: /\+ Extras/i });
        
        // Initially collapsed visually (handled by css), but inputs might be in dom
        expect(screen.getByLabelText(/Who helped you\?/i)).toBeInTheDocument();
        
        fireEvent.click(extrasBtn);
        expect(screen.getByRole('button', { name: /− Extras/i })).toBeInTheDocument();
    });

    it('submits a normal challenge and shows success toast and confetti', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/play/level/dungeon' } });
        
        const notesInput = screen.getByLabelText(/Notes/i);
        fireEvent.change(notesInput, { target: { value: 'This was fun' } });
        
        client.post.mockResolvedValueOnce({
            data: { success: true, message: 'Challenge submitted successfully!', duck_reward: 10 }
        });

        fireEvent.submit(screen.getByRole('button', { name: /Submit Challenge/i }).closest('form'));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/challenge/submit', {
                url: 'https://codecombat.com/play/level/dungeon',
                helpers: '',
                notes: 'This was fun'
            }, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        });

        expect(toast.success).toHaveBeenCalledWith('Challenge submitted successfully!');
        expect(confetti).toHaveBeenCalled();
        expect(mockCheckAuth).toHaveBeenCalled();
        
        // Form is reset
        expect(urlInput.value).toBe('');
    });

    it('submits a normal challenge without reward issued', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/play/level/dungeon' } });
        
        client.post.mockResolvedValueOnce({
            data: { success: true, reward_issued: false }
        });

        fireEvent.submit(screen.getByRole('button', { name: /Submit Challenge/i }).closest('form'));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalled();
        });

        expect(toast).toHaveBeenCalledWith(
            "Challenge complete! But since you aren't assigned to this track, you didn't get a duck. Ask your teacher to change your track!",
            expect.any(Object)
        );
        expect(mockCheckAuth).toHaveBeenCalled();
    });

    it('handles normal challenge submission error', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/play/level/dungeon' } });
        
        client.post.mockRejectedValueOnce({
            response: { data: { error: 'Invalid URL' } }
        });

        fireEvent.submit(screen.getByRole('button', { name: /Submit Challenge/i }).closest('form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Invalid URL');
        });
        expect(urlInput.value).toBe('');
    });

    it('detects a certificate URL and switches to certificate mode', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/certificates/1234?course=cs1' } });
        
        await waitFor(() => {
            expect(screen.getByLabelText(/Upload Certificate PDF/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Submit Certificate/i })).toBeInTheDocument();
        });
    });

    it('validates file upload in certificate mode', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/certificates/1234?course=cs1' } });
        
        await waitFor(() => {
            expect(screen.getByLabelText(/Upload Certificate PDF/i)).toBeInTheDocument();
        });

        const fileInput = screen.getByLabelText(/Upload Certificate PDF/i);
        const badFile = new File(['hello'], 'hello.txt', { type: 'text/plain' });
        
        fireEvent.change(fileInput, { target: { files: [badFile] } });
        expect(toast.error).toHaveBeenCalledWith('Please select a valid PDF file.');
        
        const goodFile = new File(['hello'], 'cert.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [goodFile] } });
        
        expect(screen.getByText('cert.pdf')).toBeInTheDocument();
    });

    it('prevents certificate submission without file', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/certificates/1234?course=cs1' } });
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Submit Certificate/i })).toBeInTheDocument();
        });

        fireEvent.submit(screen.getByRole('button', { name: /Submit Certificate/i }).closest('form'));
        
        expect(toast.error).toHaveBeenCalledWith('Please upload the certificate PDF file.');
        expect(client.post).not.toHaveBeenCalled();
    });

    it('submits certificate successfully', async () => {
        render(<SubmitChallenge />);
        
        const urlInput = screen.getByLabelText(/URL/i);
        fireEvent.change(urlInput, { target: { value: 'https://codecombat.com/certificates/1234?course=cs1' } });
        
        await waitFor(() => {
            expect(screen.getByLabelText(/Upload Certificate PDF/i)).toBeInTheDocument();
        });

        const fileInput = screen.getByLabelText(/Upload Certificate PDF/i);
        const goodFile = new File(['hello'], 'cert.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [goodFile] } });

        client.post.mockResolvedValueOnce({
            data: { success: true }
        });

        fireEvent.submit(screen.getByRole('button', { name: /Submit Certificate/i }).closest('form'));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/achievements/submit_certificate', expect.any(FormData), expect.any(Object));
        });

        expect(toast.success).toHaveBeenCalledWith('Certificate submitted successfully!');
        expect(confetti).toHaveBeenCalled();
        expect(urlInput.value).toBe('');
    });
});
