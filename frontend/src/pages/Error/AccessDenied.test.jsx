import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccessDenied from './AccessDenied';

// Mocking image import
vi.mock('../../assets/you_shall_not_pass.png', () => ({
    default: 'mocked-image-path.png'
}));

describe('AccessDenied Page', () => {
    it('renders access denied message and links', () => {
        render(
            <MemoryRouter>
                <AccessDenied />
            </MemoryRouter>
        );

        expect(screen.getByText('YOU SHALL NOT PASS! 🧙‍♂️')).toBeInTheDocument();
        expect(screen.getByText(/restricted area/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /return home/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('calls window.history.back when clicking Go Back button', () => {
        const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        
        render(
            <MemoryRouter>
                <AccessDenied />
            </MemoryRouter>
        );

        const backButton = screen.getByRole('button', { name: /go back/i });
        fireEvent.click(backButton);

        expect(backSpy).toHaveBeenCalled();
        backSpy.mockRestore();
    });
});
