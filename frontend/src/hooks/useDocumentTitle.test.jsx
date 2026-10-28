import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import useDocumentTitle, { formatDocumentTitle } from './useDocumentTitle';

const Page = ({ title, enabled }) => {
    useDocumentTitle(title, enabled);
    return <p>page</p>;
};

describe('useDocumentTitle', () => {
    beforeEach(() => {
        document.title = 'Classroom Chat';
    });

    it('puts the page title in front of the product name', () => {
        render(<Page title="Chat" />);

        expect(document.title).toBe('Chat · Classroom Chat');
    });

    it('uses the bare product name when the page has no title of its own', () => {
        document.title = 'something else';

        render(<Page />);

        expect(document.title).toBe('Classroom Chat');
    });

    it('follows a title that changes while the page stays mounted', () => {
        const { rerender } = render(<Page title="Profile" />);
        expect(document.title).toBe('Profile · Classroom Chat');

        rerender(<Page title="Settings" />);

        expect(document.title).toBe('Settings · Classroom Chat');
    });

    it('puts the previous title back when the page unmounts', () => {
        const { unmount } = render(<Page title="Shop" />);
        expect(document.title).toBe('Shop · Classroom Chat');

        unmount();

        expect(document.title).toBe('Classroom Chat');
    });

    it('hands over from one page to the next', () => {
        const first = render(<Page title="Achievements" />);
        first.unmount();

        render(<Page title="Activity" />);

        expect(document.title).toBe('Activity · Classroom Chat');
    });

    it('leaves the title alone when disabled (a page embedded in another page)', () => {
        document.title = 'Class · Admin · Classroom Chat';

        render(<Page title="Chat" enabled={false} />);

        expect(document.title).toBe('Class · Admin · Classroom Chat');
    });

    it('formats titles in one place', () => {
        expect(formatDocumentTitle('Users · Admin')).toBe('Users · Admin · Classroom Chat');
        expect(formatDocumentTitle('')).toBe('Classroom Chat');
    });
});
