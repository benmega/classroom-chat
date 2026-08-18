import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminLibrary from './AdminLibrary';

vi.mock('./AdminStandardProjects', () => ({ default: () => <div data-testid="AdminStandardProjects">Projects</div> }));
vi.mock('./AdminAchievements', () => ({ default: () => <div data-testid="AdminAchievements">Achievements</div> }));
vi.mock('./AdminChallenges', () => ({ default: () => <div data-testid="AdminChallenges">Challenges</div> }));
vi.mock('../../components/admin/AdminPageHeader', () => ({ default: () => <div data-testid="AdminPageHeader">Header</div> }));

describe('AdminLibrary Component', () => {
  it('renders correctly with default tab', () => {
    render(<AdminLibrary />);
    expect(screen.getByTestId('AdminPageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('AdminStandardProjects')).toBeInTheDocument();
  });

  it('switches tabs correctly', () => {
    render(<AdminLibrary />);
    
    fireEvent.click(screen.getByText('Achievements'));
    expect(screen.getByTestId('AdminAchievements')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Courses'));
    expect(screen.getByTestId('AdminChallenges')).toBeInTheDocument();
  });
});
