import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import ObserverDashboard from './ObserverDashboard';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
    },
}));

const sampleStudents = [
    {
        id: 10,
        username: 'alice_s',
        nickname: 'Alice',
        slug: 'alice',
        is_online: true,
        current_activity: 'Solving Forest Loop',
        total_levels: 42,
        cc_levels: 30,
        oz_levels: 12,
        td_levels: 0,
        recent_project: { name: 'Castle Guard' },
    },
    {
        id: 11,
        username: 'bob_s',
        nickname: 'Bob',
        slug: 'bob',
        is_online: false,
        current_activity: null,
        total_levels: 8,
        cc_levels: 0,
        oz_levels: 0,
        td_levels: 8,
        recent_project: null,
    },
];

describe('ObserverDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockResolvedValue({
            data: {
                data: {
                    students: sampleStudents,
                    total: 2,
                    pages: 1,
                    current_page: 1,
                    per_page: 24,
                },
            },
        });
    });

    it('renders the student progress directory with read-only links', async () => {
        renderWithProviders(<ObserverDashboard />);

        expect(await screen.findByText('Student Progress Directory')).toBeInTheDocument();
        expect(screen.getByText('Read-Only Observer')).toBeInTheDocument();
        expect(screen.getByText('2 Students')).toBeInTheDocument();

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('@alice_s')).toBeInTheDocument();
        expect(screen.getByText('Solving Forest Loop')).toBeInTheDocument();
        expect(screen.getByText('CS: 30')).toBeInTheDocument();
        expect(screen.getByText('Recent project: Castle Guard')).toBeInTheDocument();

        const reportLinks = screen.getAllByRole('link', { name: /Progress Report/i });
        expect(reportLinks[0]).toHaveAttribute('href', '/parent/report/10');
        expect(reportLinks[1]).toHaveAttribute('href', '/parent/report/11');

        const pathLinks = screen.getAllByRole('link', { name: /Learning Path/i });
        expect(pathLinks[0]).toHaveAttribute('href', '/parent/course-progress/alice');
        expect(pathLinks[1]).toHaveAttribute('href', '/parent/course-progress/bob');
    });

    it('filters by search term and learning track', async () => {
        renderWithProviders(<ObserverDashboard />);
        await screen.findByText('Alice');

        const ozariaBtn = screen.getByRole('button', { name: 'Ozaria' });
        fireEvent.click(ozariaBtn);

        await waitFor(() => {
            expect(client.get).toHaveBeenLastCalledWith(
                '/api/parents/students',
                expect.objectContaining({
                    params: expect.objectContaining({ track: 'ozaria', page: 1 }),
                })
            );
        });

        const searchInput = screen.getByRole('textbox', { name: 'Search students' });
        fireEvent.change(searchInput, { target: { value: 'alice' } });

        await waitFor(() => {
            expect(client.get).toHaveBeenLastCalledWith(
                '/api/parents/students',
                expect.objectContaining({
                    params: expect.objectContaining({ search: 'alice', track: 'ozaria', page: 1 }),
                })
            );
        });
    });

    it('handles pagination across pages', async () => {
        client.get.mockResolvedValue({
            data: {
                data: {
                    students: sampleStudents,
                    total: 30,
                    pages: 2,
                    current_page: 1,
                    per_page: 24,
                },
            },
        });

        renderWithProviders(<ObserverDashboard />);
        await screen.findByText('Showing 1-24 of 30 students');

        const nextBtn = screen.getByRole('button', { name: /Next/i });
        expect(nextBtn).toBeEnabled();
        fireEvent.click(nextBtn);

        await waitFor(() => {
            expect(client.get).toHaveBeenLastCalledWith(
                '/api/parents/students',
                expect.objectContaining({
                    params: expect.objectContaining({ page: 2 }),
                })
            );
        });
    });

    it('renders empty state when no students match', async () => {
        client.get.mockResolvedValue({
            data: {
                data: {
                    students: [],
                    total: 0,
                    pages: 1,
                    current_page: 1,
                    per_page: 24,
                },
            },
        });

        renderWithProviders(<ObserverDashboard />);
        expect(await screen.findByText('No students found matching your search.')).toBeInTheDocument();
        expect(screen.getByText('Showing 0-0 of 0 students')).toBeInTheDocument();
    });

    it('shows error banner when request fails', async () => {
        client.get.mockRejectedValueOnce({ response: { data: { error: 'Forbidden' } } });
        renderWithProviders(<ObserverDashboard />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    });
});
