import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminStudentActivity from './AdminStudentActivity';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
    },
}));

describe('AdminStudentActivity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('says in words, not only in colour, whether each student is online', async () => {
        client.get.mockResolvedValue({
            data: {
                data: {
                    students: [
                        { id: 1, username: 'sam', nickname: 'Sam', is_online: true, current_activity: 'Loops', profile_picture_url: '/a.png' },
                        { id: 2, username: 'kim', nickname: 'Kim', is_online: false, profile_picture_url: '/b.png' },
                    ],
                },
            },
        });

        render(<AdminStudentActivity />);

        const sam = (await screen.findByText('Sam')).closest('.activity-card');
        const kim = screen.getByText('Kim').closest('.activity-card');
        expect(within(sam).getByRole('img', { name: 'Online' })).toHaveAttribute('title', 'Online');
        expect(within(kim).getByRole('img', { name: 'Offline' })).toHaveAttribute('title', 'Offline');
        expect(within(sam).getByText('Loops')).toBeInTheDocument();
        expect(within(kim).getByText('No recent activity')).toBeInTheDocument();
    });

    it('shows an empty state when there are no students', async () => {
        client.get.mockResolvedValue({ data: { data: { students: [] } } });

        render(<AdminStudentActivity />);

        expect(await screen.findByText('No students found.')).toBeInTheDocument();
    });

    it('shows the error when the activity cannot be loaded', async () => {
        client.get.mockRejectedValue({ response: { data: { error: 'Admin access required' } } });

        render(<AdminStudentActivity />);

        expect(await screen.findByText('Admin access required')).toBeInTheDocument();
    });

    it('asks for only the online students when the checkbox is ticked', async () => {
        client.get.mockResolvedValue({ data: { data: { students: [] } } });
        render(<AdminStudentActivity />);
        await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/admin/student_activity?is_online=false'));

        fireEvent.click(screen.getByRole('checkbox', { name: 'Show Online Only' }));

        await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/admin/student_activity?is_online=true'));
    });
});
