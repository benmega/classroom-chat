import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TechnicalSkills from './TechnicalSkills';

describe('TechnicalSkills', () => {
    it('returns null if no visible skills', () => {
        const mockSkills = [{ id: 1, category: 'concept', name: 'Variables', proficiency: 1 }];
        const { container } = render(<TechnicalSkills skills={mockSkills} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders technical skills with tooltip and icon', () => {
        const mockSkills = [
            { id: 2, category: 'language', name: 'Python', proficiency: 1 },
            { id: 3, category: 'tool', name: 'Git & GitHub', proficiency: 1 },
            { id: 4, category: 'other', name: 'CustomSkill', proficiency: 2 },
            { id: 5, category: 'language', name: 'Java', proficiency: 2 },
            { id: 6, category: 'language', name: 'C++', proficiency: 3 },
        ];

        render(<TechnicalSkills skills={mockSkills} />);

        expect(screen.getByText('Technical Skills')).toBeInTheDocument();
        expect(screen.getByText('Python')).toBeInTheDocument();
        expect(screen.getByText('Git & GitHub')).toBeInTheDocument();
        expect(screen.getByText('CustomSkill')).toBeInTheDocument();

        const pythonCard = screen.getByText('Python').closest('.tech-skill-card');
        expect(pythonCard).toHaveAttribute('title', 'Level 1: Completed 10+ challenges in Python');

        const gitCard = screen.getByText('Git & GitHub').closest('.tech-skill-card');
        expect(gitCard).toHaveAttribute('title', 'Awarded for linking a GitHub repository to a project.');

        const customCard = screen.getByText('CustomSkill').closest('.tech-skill-card');
        expect(customCard).toHaveAttribute('title', 'Awarded for proficiency in CustomSkill.');
        
        const javaCard = screen.getByText('Java').closest('.tech-skill-card');
        expect(javaCard).toHaveAttribute('title', 'Level 2: Completed 50+ challenges in Java');
        
        const cppCard = screen.getByText('C++').closest('.tech-skill-card');
        expect(cppCard).toHaveAttribute('title', 'Level 3: Completed 100+ challenges in C++');

        const icons = screen.getAllByRole('img');
        expect(icons.length).toBeGreaterThan(0);
    });
});
