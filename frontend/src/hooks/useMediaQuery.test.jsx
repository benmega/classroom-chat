import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import useMediaQuery from './useMediaQuery';
import { mockMatchMedia } from '../test/mockMatchMedia';

const Probe = ({ query }) => <p>{useMediaQuery(query) ? 'matches' : 'no match'}</p>;

describe('useMediaQuery', () => {
    let media;
    afterEach(() => media?.restore());

    it('reports whether the query matches right now', () => {
        media = mockMatchMedia(['(max-width: 800px)']);

        render(<Probe query="(max-width: 800px)" />);

        expect(screen.getByText('matches')).toBeInTheDocument();
    });

    it('reports no match for a query that does not apply', () => {
        media = mockMatchMedia(['(max-width: 800px)']);

        render(<Probe query="(min-width: 801px)" />);

        expect(screen.getByText('no match')).toBeInTheDocument();
    });

    it('re-renders when the answer changes, and stops listening on unmount', () => {
        media = mockMatchMedia();
        const { unmount } = render(<Probe query="(max-width: 800px)" />);
        expect(screen.getByText('no match')).toBeInTheDocument();

        media.set('(max-width: 800px)', true);
        expect(screen.getByText('matches')).toBeInTheDocument();

        media.set('(max-width: 800px)', false);
        expect(screen.getByText('no match')).toBeInTheDocument();

        unmount();
        // a change after unmount reaches nobody and must not throw
        media.set('(max-width: 800px)', true);
    });

    it('reports false where matchMedia does not exist', () => {
        const original = window.matchMedia;
        window.matchMedia = undefined;
        try {
            render(<Probe query="(max-width: 800px)" />);
            expect(screen.getByText('no match')).toBeInTheDocument();
        } finally {
            window.matchMedia = original;
        }
    });
});
