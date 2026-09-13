import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import KioskUpload from './KioskUpload';
import client from '../../api/client';

vi.mock('react-router-dom', () => ({
    useParams: () => ({ classId: '123' }),
    useNavigate: () => vi.fn(),
}));

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        promise: vi.fn((promise) => promise),
        error: vi.fn(),
    },
}));

vi.mock('../../components/profile/CameraModal', () => ({
    default: ({ isOpen, onClose, onCapture }) => (
        isOpen ? (
            <div data-testid="camera-modal">
                <span>Camera Modal Open</span>
                <button onClick={() => onCapture(new File(['test'], 'test.jpg', { type: 'image/jpeg' }))}>
                    Mock Capture
                </button>
                <button onClick={onClose}>Close Camera</button>
            </div>
        ) : null
    ),
}));

describe('KioskUpload Component', () => {
    const mockClassroom = {
        id: 123,
        name: 'Math 101',
        students: [
            { id: 1, username: 'alice', nickname: 'Alice' },
            { id: 2, username: 'bob', nickname: 'Bob' },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockResolvedValue({ data: { classroom: mockClassroom } });
    });

    it('renders classroom and list of students', async () => {
        render(<KioskUpload />);
        
        await waitFor(() => {
            expect(screen.getByText('Math 101 Upload Kiosk')).toBeInTheDocument();
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });
    });

    it('opens host camera modal when a student card is clicked on desktop', async () => {
        render(<KioskUpload />);

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice'));

        await waitFor(() => {
            expect(screen.getByTestId('camera-modal')).toBeInTheDocument();
        });
    });

    it('uploads note image captured from camera modal', async () => {
        client.post.mockResolvedValueOnce({ data: { success: true } });

        render(<KioskUpload />);

        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Alice'));

        await waitFor(() => {
            expect(screen.getByTestId('camera-modal')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Mock Capture'));

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith(
                '/notes/kiosk-upload',
                expect.any(FormData)
            );
        });
    });
});
