import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

describe('NotFound Page', () => {
    it('renders with default message', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Resource Not Found')).toBeInTheDocument();
        expect(screen.getByText("The page or resource you are looking for doesn't exist or has been moved.")).toBeInTheDocument();
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    it('renders custom message when passed as prop', () => {
        const customMessage = 'Could not find the requested classroom details.';
        render(
            <MemoryRouter>
                <NotFound message={customMessage} />
            </MemoryRouter>
        );

        expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('calls window.history.back when clicking the back button', () => {
        const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
        
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        const backButton = screen.getByRole('button', { name: /go back/i });
        fireEvent.click(backButton);

        expect(backSpy).toHaveBeenCalled();
        backSpy.mockRestore();
    });
});
