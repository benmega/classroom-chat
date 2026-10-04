import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ChatMessage from './ChatMessage';

const baseMsg = {
    id: 7,
    user_id: 2,
    user_name: 'Alice',
    slug: 'alice',
    content: 'Hello there',
    created_at: '2024-05-01T10:00:00Z',
};

const renderMessage = (msg = {}, props = {}) => render(
    <MemoryRouter>
        <ChatMessage
            msg={{ ...baseMsg, ...msg }}
            user={{ id: 1, role: 'student' }}
            onDelete={vi.fn()}
            isConsecutive={false}
            {...props}
        />
    </MemoryRouter>
);

describe('ChatMessage', () => {
    describe('avatar', () => {
        it('links to the author profile with a descriptive name', () => {
            renderMessage();

            const link = screen.getByRole('link', { name: "View Alice's profile" });
            expect(link).toHaveAttribute('href', '/profile/alice');
        });

        it('does not name the link after the picture, which only repeats the label', () => {
            renderMessage({ user_profile_pic: 'alice.png' });

            const link = screen.getByRole('link', { name: "View Alice's profile" });
            expect(link.querySelector('img')).toHaveAttribute('alt', '');
        });

        it('falls back to a generic name when the author name is missing', () => {
            renderMessage({ user_name: null });

            expect(screen.getByRole('link', { name: "View user's profile" })).toBeInTheDocument();
        });

        it('renders a plain avatar, not a dead "#" link, when the user has no profile slug', () => {
            const { container } = renderMessage({ slug: null, user_name: null });

            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            const avatar = container.querySelector('.avatar-link');
            expect(avatar.tagName).toBe('DIV');
            expect(avatar.querySelector('.avatar-container')).not.toBeNull();
        });

        it('shows no avatar for a consecutive message of the same author', () => {
            const { container } = renderMessage({}, { isConsecutive: true });

            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            expect(container.querySelector('.chat-avatar-placeholder')).not.toBeNull();
        });
    });

    describe('delete button', () => {
        it('has an accessible name and deletes the message for its owner', () => {
            const onDelete = vi.fn();
            renderMessage({ user_id: 1 }, { onDelete });

            fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
            expect(onDelete).toHaveBeenCalledWith(7);
        });

        it('is offered to admins on other people\'s messages', () => {
            renderMessage({}, { user: { id: 9, role: 'admin' } });

            expect(screen.getByRole('button', { name: 'Delete post' })).toBeInTheDocument();
        });

        it('is not offered to other students', () => {
            renderMessage();

            expect(screen.queryByRole('button', { name: 'Delete post' })).not.toBeInTheDocument();
        });
    });
});
