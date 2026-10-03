import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminChallenges from './AdminChallenges';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() }
}));

vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn(() => Promise.resolve(true)),
}));

describe('AdminChallenges - 3D Modeling domain', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/crud/courses')) {
                return Promise.resolve({
                    data: { data: [{ id: '3d-1', name: 'TinkerCAD 1', domain: '3d-modeling' }] }
                });
            }
            if (url.includes('/api/admin/challenges/all_grouped')) {
                return Promise.resolve({
                    data: {
                        data: {
                            challenges: {
                                '3d-1': [{
                                    id: 11, name: 'Make a Cube', slug: 'make-a-cube', course_id: '3d-1',
                                    domain: '3d-modeling', difficulty: 'easy', value: 2, sequence: 1, description: ''
                                }]
                            }
                        }
                    }
                });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it('keeps the 3d-modeling domain when editing a 3D challenge', async () => {
        render(<AdminChallenges />);

        const courseCard = await screen.findByRole('button', { name: /TinkerCAD 1/i });
        fireEvent.click(courseCard);

        fireEvent.click(await screen.findByText('Make a Cube'));

        const domainSelect = await screen.findByLabelText('Domain');
        expect(domainSelect).toHaveValue('3d-modeling');
        expect(screen.getAllByRole('option', { name: '3D Modeling' }).length).toBeGreaterThan(0);
    });

    it('offers 3D Modeling when adding a course', async () => {
        render(<AdminChallenges />);
        await screen.findByRole('button', { name: /TinkerCAD 1/i });

        fireEvent.click(screen.getByRole('button', { name: /Add Course/i }));

        const domainSelect = await screen.findByLabelText('Domain *');
        fireEvent.change(domainSelect, { target: { value: '3d-modeling' } });
        await waitFor(() => expect(domainSelect).toHaveValue('3d-modeling'));
    });
});
