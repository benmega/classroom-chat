import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminStudentActivity from './AdminStudentActivity';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

const students = [
  {
    id: 1,
    username: 'amy',
    nickname: 'Amy B',
    profile_picture_url: '/amy.png',
    is_online: true,
    current_activity: 'Working on Python',
    last_activity_time: '2025-03-01T10:00:00Z',
  },
  {
    id: 2,
    username: 'bob',
    nickname: null,
    profile_picture_url: '/bob.png',
    is_online: false,
    current_activity: null,
    last_activity_time: null,
  },
];

const respondWith = (list) => client.get.mockResolvedValue({ data: { data: { students: list } } });

describe('AdminStudentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    respondWith(students);
  });

  it('shows placeholders while the activity loads', async () => {
    client.get.mockReturnValue(new Promise(() => {}));

    const { container } = render(<AdminStudentActivity />);

    expect(container.querySelectorAll('.skeleton-card')).toHaveLength(4);
    expect(screen.queryByText('No students found.')).not.toBeInTheDocument();
  });

  it('lists every student with their name, status and current activity', async () => {
    const { container } = render(<AdminStudentActivity />);

    expect(await screen.findByText('Amy B')).toBeInTheDocument();
    expect(screen.getByText('@amy')).toBeInTheDocument();
    expect(screen.getByText('Working on Python')).toBeInTheDocument();
    // Without a nickname the username is the heading
    expect(screen.getByRole('heading', { name: 'bob' })).toBeInTheDocument();
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(container.querySelectorAll('.status-dot.online')).toHaveLength(1);
    expect(container.querySelectorAll('.status-dot.offline')).toHaveLength(1);
    expect(screen.getByAltText('amy')).toHaveAttribute('src', '/amy.png');
  });

  it('shows the time of the last activity only for students that have one', async () => {
    const { container } = render(<AdminStudentActivity />);
    await screen.findByText('Amy B');

    const times = container.querySelectorAll('.activity-time');
    expect(times).toHaveLength(1);
    expect(times[0]).toHaveTextContent(new Date('2025-03-01T10:00:00Z').toLocaleString());
  });

  it('starts with every student, not only the online ones', async () => {
    render(<AdminStudentActivity />);
    await screen.findByText('Amy B');

    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.get).toHaveBeenCalledWith('/api/admin/student_activity?is_online=false');
    expect(screen.getByLabelText('Show Online Only')).not.toBeChecked();
  });

  it('asks again for the online students only when the toggle is switched on', async () => {
    render(<AdminStudentActivity />);
    await screen.findByText('Amy B');
    respondWith([students[0]]);

    fireEvent.click(screen.getByLabelText('Show Online Only'));

    await waitFor(() =>
      expect(client.get).toHaveBeenLastCalledWith('/api/admin/student_activity?is_online=true')
    );
    await waitFor(() => expect(screen.queryByText('@bob')).not.toBeInTheDocument());
    expect(screen.getByText('@amy')).toBeInTheDocument();
  });

  it('says so when there are no students', async () => {
    respondWith([]);

    render(<AdminStudentActivity />);

    expect(await screen.findByText('No students found.')).toBeInTheDocument();
  });

  it('treats a response without a student list as an empty one', async () => {
    client.get.mockResolvedValue({ data: {} });

    render(<AdminStudentActivity />);

    expect(await screen.findByText('No students found.')).toBeInTheDocument();
  });

  it('shows the server error when the request fails', async () => {
    client.get.mockRejectedValue({ response: { data: { error: 'Admins only.' } } });

    render(<AdminStudentActivity />);

    expect(await screen.findByText('Admins only.')).toBeInTheDocument();
    expect(screen.getByText('No students found.')).toBeInTheDocument();
  });

  it('falls back to a generic message when the failure carries no reason', async () => {
    client.get.mockRejectedValue(new Error('Network Error'));

    render(<AdminStudentActivity />);

    expect(await screen.findByText('Failed to fetch student activity')).toBeInTheDocument();
  });

  it('clears the error once a later request succeeds', async () => {
    client.get.mockRejectedValueOnce(new Error('Network Error'));
    render(<AdminStudentActivity />);
    await screen.findByText('Failed to fetch student activity');

    fireEvent.click(screen.getByLabelText('Show Online Only'));

    expect(await screen.findByText('Amy B')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch student activity')).not.toBeInTheDocument();
  });
});
