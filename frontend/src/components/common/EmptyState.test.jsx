import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Inbox } from 'lucide-react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
    it('shows the title as a heading and the description under it', () => {
        render(<EmptyState title="No messages yet" description="Messages from your teacher show up here." />);

        expect(screen.getByRole('heading', { level: 3, name: 'No messages yet' })).toBeInTheDocument();
        expect(screen.getByText('Messages from your teacher show up here.')).toBeInTheDocument();
    });

    it('lets the page pick the heading level', () => {
        render(<EmptyState title="Nothing here" titleAs="h2" />);

        expect(screen.getByRole('heading', { level: 2, name: 'Nothing here' })).toBeInTheDocument();
    });

    it('renders an icon component, decoratively', () => {
        const { container } = render(<EmptyState icon={Inbox} title="Empty" />);

        const icon = container.querySelector('.ui-empty__icon');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
        expect(icon.querySelector('svg')).toBeInTheDocument();
    });

    it('also takes an icon that is already an element', () => {
        const { container } = render(<EmptyState icon={<svg data-testid="custom" />} title="Empty" />);

        expect(container.querySelector('.ui-empty__icon')).toContainElement(screen.getByTestId('custom'));
    });

    it('renders the action slot', () => {
        render(<EmptyState title="No projects" action={<button type="button">Create a project</button>} />);

        expect(screen.getByRole('button', { name: 'Create a project' })).toBeInTheDocument();
    });

    it('leaves out the parts it was not given', () => {
        const { container } = render(<EmptyState title="Only a title" />);

        expect(container.querySelector('.ui-empty__icon')).toBeNull();
        expect(container.querySelector('.ui-empty__description')).toBeNull();
        expect(container.querySelector('.ui-empty__action')).toBeNull();
    });

    it('is quiet by default and announced only when it answers something the user just did', () => {
        const { rerender } = render(<EmptyState title="No results" />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        rerender(<EmptyState title="No results" live />);
        expect(screen.getByRole('status')).toHaveTextContent('No results');
    });
});
