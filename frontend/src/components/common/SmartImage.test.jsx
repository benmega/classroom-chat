import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SmartImage from './SmartImage';

describe('SmartImage loading attributes', () => {
    it('loads lazily and decodes asynchronously by default', () => {
        render(<SmartImage src="/pics/a.jpg" alt="Avatar" />);

        const img = screen.getByRole('img', { name: 'Avatar' });
        expect(img).toHaveAttribute('src', '/pics/a.jpg');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');
    });

    it('loads eagerly when the eager prop is set, and still decodes asynchronously', () => {
        render(<SmartImage src="/pics/a.jpg" alt="Hero" eager />);

        const img = screen.getByRole('img', { name: 'Hero' });
        expect(img).toHaveAttribute('loading', 'eager');
        expect(img).toHaveAttribute('decoding', 'async');
    });

    it('does not forward the eager prop to the DOM as an attribute', () => {
        render(<SmartImage src="/pics/a.jpg" alt="Hero" eager />);

        expect(screen.getByRole('img', { name: 'Hero' })).not.toHaveAttribute('eager');
    });

    it('lets an explicit loading or decoding prop win over the defaults', () => {
        render(<SmartImage src="/pics/a.jpg" alt="Custom" eager loading="lazy" decoding="sync" />);

        const img = screen.getByRole('img', { name: 'Custom' });
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'sync');
    });

    it('keeps the lazy defaults on the fallback picture it swaps in after a load error', () => {
        render(<SmartImage src="/pics/missing.jpg" alt="Avatar" />);

        fireEvent.error(screen.getByRole('img', { name: 'Avatar' }));

        const img = screen.getByRole('img', { name: 'Avatar' });
        expect(img).toHaveAttribute('src', '/static/images/Default_pfp.jpg');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');
    });
});

describe('SmartImage fallbacks', () => {
    it('shows the project placeholder when a project image fails', () => {
        render(<SmartImage src="/pics/missing.png" alt="Cover" fallbackType="project" />);

        fireEvent.error(screen.getByRole('img', { name: 'Cover' }));

        expect(screen.getByRole('img', { name: 'Cover' })).toHaveAttribute('src', '/static/images/Project_placeholder.png');
    });

    it('uses the fallback straight away when there is no src', () => {
        render(<SmartImage src={null} alt="Nobody" />);

        expect(screen.getByRole('img', { name: 'Nobody' })).toHaveAttribute('src', '/static/images/Default_pfp.jpg');
    });

    it('renders a text placeholder instead of an img once the fallback fails too', () => {
        render(<SmartImage src="/pics/missing.jpg" alt="Avatar" />);

        fireEvent.error(screen.getByRole('img', { name: 'Avatar' }));
        fireEvent.error(screen.getByRole('img', { name: 'Avatar' }));

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByText('No Avatar')).toBeInTheDocument();
    });

    it('labels the placeholder "No Preview" for project images', () => {
        render(<SmartImage src="/pics/missing.png" alt="Cover" fallbackType="project" />);

        fireEvent.error(screen.getByRole('img', { name: 'Cover' }));
        fireEvent.error(screen.getByRole('img', { name: 'Cover' }));

        expect(screen.getByText('No Preview')).toBeInTheDocument();
    });

    it('tries the new src from scratch after the src prop changes', () => {
        const { rerender } = render(<SmartImage src="/pics/missing.jpg" alt="Avatar" />);
        fireEvent.error(screen.getByRole('img', { name: 'Avatar' }));
        fireEvent.error(screen.getByRole('img', { name: 'Avatar' }));
        expect(screen.queryByRole('img')).toBeNull();

        rerender(<SmartImage src="/pics/b.jpg" alt="Avatar" />);

        expect(screen.getByRole('img', { name: 'Avatar' })).toHaveAttribute('src', '/pics/b.jpg');
    });
});
