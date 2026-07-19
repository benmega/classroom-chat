import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AchievementsList from './AchievementsList';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('AchievementsList', () => {
    it('returns null if no achievements', () => {
        const { container } = render(<AchievementsList achievements={[]} />, { wrapper: MemoryRouter });
        expect(container.firstChild).toBeNull();
    });

    it('renders achievements list and navigates on click', () => {
        const mockAchievements = [
            {
                id: 1,
                earned_at: '2023-01-01T00:00:00Z',
                achievement: {
                    name: 'First Blood',
                    description: 'Get first kill',
                    slug: 'first-blood'
                }
            }
        ];

        render(<AchievementsList achievements={mockAchievements} />, { wrapper: MemoryRouter });

        expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
        expect(screen.getByText('First Blood')).toBeInTheDocument();

        const item = screen.getByTitle('Get first kill');
        fireEvent.click(item);

        expect(mockNavigate).toHaveBeenCalledWith('/achievements');
    });
});
