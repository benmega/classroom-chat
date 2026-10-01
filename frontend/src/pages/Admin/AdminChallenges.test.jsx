import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminChallenges from './AdminChallenges';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { showConfirm } from '../../utils/confirm';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn(),
}));

const challenges = [
    { id: 1, name: 'Loops', slug: 'loops', value: 2 },
    { id: 2, name: 'Arrays', slug: 'arrays', value: 3 },
];

const rejection = (data, status = 400) => ({ response: { status, data } });

describe('AdminChallenges', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockReset();
        client.post.mockReset();
        client.put.mockReset();
        client.delete.mockReset();
        showConfirm.mockResolvedValue(true);
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/crud/courses')) {
                return Promise.resolve({ data: { data: [{ id: 'cs1', name: 'CS One', domain: 'codecombat.com' }] } });
            }
            if (url.includes('/api/admin/challenges/all_grouped')) {
                return Promise.resolve({ data: { data: { challenges: { cs1: challenges } } } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    const openCourse = async () => {
        render(<AdminChallenges />);
        fireEvent.click(await screen.findByText('CS One'));
        await screen.findByText('Loops');
    };

    it('lists the challenges of a course', async () => {
        await openCourse();

        expect(screen.getByText('Arrays')).toBeInTheDocument();
        expect(screen.getByText('loops')).toBeInTheDocument();
    });

    it('deletes a challenge after confirmation and reloads the list', async () => {
        client.delete.mockResolvedValueOnce({ data: { message: 'Challenge deleted.' } });
        await openCourse();
        const loadsBefore = client.get.mock.calls.filter(([url]) => url.includes('all_grouped')).length;

        fireEvent.click(screen.getAllByTitle('Delete Challenge')[0]);

        await waitFor(() => expect(client.delete).toHaveBeenCalledWith('/api/admin/challenges/1'));
        expect(showConfirm).toHaveBeenCalledWith(
            'Are you sure you want to delete challenge "Loops"?',
            { title: 'Delete Challenge', destructive: true }
        );
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Challenge deleted.'));
        await waitFor(() => {
            expect(client.get.mock.calls.filter(([url]) => url.includes('all_grouped')).length).toBeGreaterThan(loadsBefore);
        });
    });

    it('does not delete a challenge when the confirmation is cancelled', async () => {
        showConfirm.mockResolvedValue(false);
        await openCourse();

        fireEvent.click(screen.getAllByTitle('Delete Challenge')[0]);

        await waitFor(() => expect(showConfirm).toHaveBeenCalledTimes(1));
        expect(client.delete).not.toHaveBeenCalled();
    });

    it('shows the reason the server gives when a challenge cannot be deleted', async () => {
        client.delete.mockRejectedValueOnce(rejection({ status: 'error', data: null, error: 'Challenge not found' }, 404));
        await openCourse();

        fireEvent.click(screen.getAllByTitle('Delete Challenge')[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Challenge not found'));
        expect(screen.getByText('Loops')).toBeInTheDocument();
    });

    it('falls back to a generic message when a deletion fails without a body', async () => {
        client.delete.mockRejectedValueOnce(new Error('Network Error'));
        await openCourse();

        fireEvent.click(screen.getAllByTitle('Delete Challenge')[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete challenge.'));
    });

    it('shows the reason the server gives when a challenge cannot be saved', async () => {
        client.post.mockRejectedValueOnce(rejection({ success: false, message: 'Challenge slug already exists' }, 409));
        await openCourse();

        fireEvent.click(screen.getByRole('button', { name: /Add Challenge/ }));
        fireEvent.change(screen.getByLabelText(/Challenge Name/), { target: { value: 'Functions' } });
        fireEvent.change(screen.getByLabelText(/Slug/), { target: { value: 'loops' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Save Challenge' }).closest('form'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Challenge slug already exists'));
        expect(client.post).toHaveBeenCalledWith('/api/admin/challenges/add', expect.objectContaining({ name: 'Functions', slug: 'loops', course_id: 'cs1' }));
    });

    it('shows the reason the server gives when a course cannot be added', async () => {
        client.post.mockRejectedValueOnce(rejection({ status: 'error', data: null, error: 'Course already exists' }, 409));
        render(<AdminChallenges />);
        await screen.findByText('CS One');

        fireEvent.click(screen.getByRole('button', { name: /Add Course/ }));
        fireEvent.change(screen.getByLabelText(/Course ID/), { target: { value: 'cs1' } });
        fireEvent.change(screen.getByLabelText(/Course Name/), { target: { value: 'CS One' } });
        fireEvent.submit(screen.getByRole('button', { name: 'Save Course' }).closest('form'));

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Course already exists'));
    });

    it('shows the reason the server gives when a new order cannot be saved', async () => {
        client.put.mockRejectedValueOnce(rejection({ status: 'error', data: null, error: 'Admin access required' }, 403));
        await openCourse();
        const rows = document.querySelectorAll('.challenge-list-item');

        fireEvent.dragStart(rows[0]);
        fireEvent.dragEnter(rows[1]);
        fireEvent.dragEnd(rows[0]);

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Admin access required'));
        expect(client.put).toHaveBeenCalledWith('/api/admin/challenges/reorder', {
            updates: [{ id: 2, sequence: 1 }, { id: 1, sequence: 2 }],
        });
    });
});
