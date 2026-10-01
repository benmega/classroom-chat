import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Tutorial from './Tutorial';
import useAuthStore from '../../store/useAuthStore';

const ZERO_RECT = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
const rectAt = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

// happy-dom does no layout, so give the page elements a size by hand: anything
// that is not given one reports the all-zero rect of a display:none element.
const addElement = (html, rect = ZERO_RECT) => {
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const el = holder.firstElementChild;
    el.getBoundingClientRect = () => rect;
    document.body.appendChild(el);
    return el;
};

const renderTutorial = (path = '/') => render(
    <MemoryRouter initialEntries={[path]}>
        <Tutorial />
    </MemoryRouter>
);

const openTutorial = async (path) => {
    renderTutorial(path);
    await act(async () => { vi.advanceTimersByTime(1000); });
    await act(async () => { vi.advanceTimersByTime(20); });
};

const dotCount = () => document.querySelectorAll('.spotlight-dot').length;
const cutout = () => document.querySelector('#spotlight-mask rect[fill="black"]');
const title = () => document.querySelector('.spotlight-title')?.textContent;
const nextButton = () => document.querySelector('.spotlight-footer button');
const next = async () => {
    await act(async () => { fireEvent.click(nextButton()); });
    await act(async () => { vi.advanceTimersByTime(20); });
};

describe('Tutorial', () => {
    let completeTutorial;

    beforeEach(() => {
        // Run animation frames off the (fake) timer clock so they can be stepped.
        vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(() => cb(0), 0));
        vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
        vi.useFakeTimers();
        completeTutorial = vi.fn();
        useAuthStore.setState({
            user: { id: 1, username: 'student1', role: 'student', has_seen_tutorial: false },
            completeTutorial,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
        window.innerWidth = 1024;
        window.innerHeight = 768;
    });

    it('renders nothing before the delay has passed and for users who have seen it', async () => {
        renderTutorial('/');
        expect(document.querySelector('.spotlight-overlay')).toBeNull();

        act(() => { useAuthStore.setState({ user: { id: 1, role: 'student', has_seen_tutorial: true } }); });
        await act(async () => { vi.advanceTimersByTime(2000); });
        expect(document.querySelector('.spotlight-overlay')).toBeNull();
    });

    it('stays closed off the tutorial path and when signed out', async () => {
        renderTutorial('/shop');
        await act(async () => { vi.advanceTimersByTime(2000); });
        expect(document.querySelector('.spotlight-overlay')).toBeNull();

        act(() => { useAuthStore.setState({ user: null }); });
        await act(async () => { vi.advanceTimersByTime(2000); });
        expect(document.querySelector('.spotlight-overlay')).toBeNull();
    });

    it('walks through every slide when all targets are on screen', async () => {
        addElement('<a class="stat-badge ducks"></a>', rectAt(400, 10, 60, 30));
        addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();

        expect(title()).toBe('Welcome!');
        expect(dotCount()).toBe(3);
        expect(cutout()).toBeNull();

        await next();
        expect(title()).toBe('Rewards');
        expect(cutout().getAttribute('x')).toBe(String(400 - 8));

        await next();
        expect(title()).toBe('Account');
        expect(nextButton()).toHaveTextContent('Got it!');

        await next();
        expect(completeTutorial).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.spotlight-overlay')).toBeNull();
    });

    it('does not show slides for elements that no longer exist in the app', async () => {
        addElement('<a class="stat-badge ducks"></a>', rectAt(400, 10, 60, 30));
        addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();

        const seen = [title()];
        while (nextButton().textContent !== 'Got it!') {
            await next();
            seen.push(title());
        }

        expect(seen).toEqual(['Welcome!', 'Rewards', 'Account']);
    });

    it('skips a slide whose target is missing', async () => {
        addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();

        expect(dotCount()).toBe(2);
        await next();
        expect(title()).toBe('Account');
        expect(nextButton()).toHaveTextContent('Got it!');
    });

    it('skips a slide whose target has no size (hidden at this viewport)', async () => {
        // Phones: the ducks badge is inside a display:none container.
        addElement('<a class="stat-badge ducks"></a>', ZERO_RECT);
        addElement('<button class="hamburger-toggle"></button>', rectAt(10, 10, 40, 40));
        await openTutorial();

        expect(dotCount()).toBe(2);
        await next();
        expect(title()).toBe('Account');
    });

    it('spotlights the visible match when a selector also matches a hidden element', async () => {
        // Document order on phones: the (hidden) desktop rail comes before the hamburger.
        addElement('<aside class="desktop-nav-rail"></aside>', ZERO_RECT);
        addElement('<button class="hamburger-toggle"></button>', rectAt(300, 12, 40, 40));
        await openTutorial();

        await next();
        expect(title()).toBe('Account');
        const hole = cutout();
        expect(hole.getAttribute('x')).toBe(String(300 - 8));
        expect(hole.getAttribute('y')).toBe(String(12 - 8));
        expect(hole.getAttribute('width')).toBe(String(40 + 16));
    });

    it('only shows the welcome slide when no target is on screen', async () => {
        await openTutorial();

        expect(title()).toBe('Welcome!');
        expect(dotCount()).toBe(1);
        expect(nextButton()).toHaveTextContent('Got it!');
        await next();
        expect(completeTutorial).toHaveBeenCalledTimes(1);
    });

    it('re-checks the slides when the window is resized', async () => {
        const ducks = addElement('<a class="stat-badge ducks"></a>', rectAt(400, 10, 60, 30));
        addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();
        expect(dotCount()).toBe(3);

        // Shrinking to phone size hides the badge...
        ducks.getBoundingClientRect = () => ZERO_RECT;
        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(20);
        });
        expect(dotCount()).toBe(2);

        // ...and growing back shows it again.
        ducks.getBoundingClientRect = () => rectAt(400, 10, 60, 30);
        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(20);
        });
        expect(dotCount()).toBe(3);
    });

    it('keeps the current slide valid when a resize removes slides under it', async () => {
        const ducks = addElement('<a class="stat-badge ducks"></a>', rectAt(400, 10, 60, 30));
        const rail = addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();
        await next();
        await next();
        expect(title()).toBe('Account');

        ducks.getBoundingClientRect = () => ZERO_RECT;
        rail.getBoundingClientRect = () => ZERO_RECT;
        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(20);
        });

        expect(dotCount()).toBe(1);
        expect(title()).toBe('Welcome!');
    });

    it('updates the spotlight position when the window is resized', async () => {
        const rail = addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();
        await next();
        expect(cutout().getAttribute('x')).toBe('-8');

        rail.getBoundingClientRect = () => rectAt(20, 0, 80, 600);
        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(20);
        });

        expect(cutout().getAttribute('x')).toBe('12');
    });

    it('does not use a stale target after the element disappears on resize', async () => {
        const rail = addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
        await openTutorial();
        await next();
        expect(title()).toBe('Account');

        rail.remove();
        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(20);
        });

        expect(title()).toBe('Welcome!');
        expect(cutout()).toBeNull();
    });

    it('closes from the X button and records that it was seen', async () => {
        await openTutorial();

        await act(async () => { fireEvent.click(screen.getByLabelText('Close tutorial')); });

        expect(completeTutorial).toHaveBeenCalledTimes(1);
        expect(document.querySelector('.spotlight-overlay')).toBeNull();
    });

    describe('dialog accessibility', () => {
        const card = () => document.querySelector('.spotlight-card');

        it('is a modal dialog named by the current slide title', async () => {
            await openTutorial();

            const dialog = screen.getByRole('dialog', { name: 'Welcome!' });
            expect(dialog).toBe(card());
            expect(dialog).toHaveAttribute('aria-modal', 'true');
        });

        it('updates its name when the slide changes', async () => {
            addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
            await openTutorial();

            await next();

            expect(screen.getByRole('dialog', { name: 'Account' })).toBe(card());
        });

        it('hides the decorative spotlight mask from assistive technology', async () => {
            await openTutorial();

            expect(document.querySelector('.spotlight-svg')).toHaveAttribute('aria-hidden', 'true');
        });

        it('moves focus to the Next button when it opens', async () => {
            await openTutorial();

            expect(nextButton()).toHaveFocus();
        });

        it('keeps focus on the same button as the slides advance', async () => {
            addElement('<a class="stat-badge ducks"></a>', rectAt(400, 10, 60, 30));
            await openTutorial();

            await next();

            expect(title()).toBe('Rewards');
            expect(nextButton()).toHaveFocus();
        });

        it('closes on Escape and records that it was seen', async () => {
            await openTutorial();

            await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }); });

            expect(completeTutorial).toHaveBeenCalledTimes(1);
            expect(document.querySelector('.spotlight-overlay')).toBeNull();
        });

        it('keeps Tab and Shift+Tab on the card', async () => {
            await openTutorial();
            const close = screen.getByLabelText('Close tutorial');

            close.focus();
            fireEvent.keyDown(close, { key: 'Tab' });
            expect(nextButton()).toHaveFocus();

            fireEvent.keyDown(nextButton(), { key: 'Tab', shiftKey: true });
            expect(close).toHaveFocus();
        });

        it('returns focus to the element that had it before the tour opened', async () => {
            const trigger = addElement('<button id="before-tour">Menu</button>', rectAt(0, 0, 10, 10));
            renderTutorial('/');
            trigger.focus();
            await act(async () => { vi.advanceTimersByTime(1000); });
            await act(async () => { vi.advanceTimersByTime(20); });
            expect(nextButton()).toHaveFocus();

            await act(async () => { fireEvent.click(screen.getByLabelText('Close tutorial')); });

            expect(trigger).toHaveFocus();
        });
    });

    describe('parents', () => {
        beforeEach(() => {
            useAuthStore.setState({
                user: { id: 2, username: 'parent1', role: 'parent', has_seen_tutorial: false },
            });
        });

        it('only opens on the parent dashboard', async () => {
            renderTutorial('/');
            await act(async () => { vi.advanceTimersByTime(2000); });

            expect(document.querySelector('.spotlight-overlay')).toBeNull();
        });

        it('shows the welcome and account slides, without the removed link-your-student slide', async () => {
            addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
            await openTutorial('/parent/dashboard');

            expect(title()).toBe('Welcome!');
            expect(dotCount()).toBe(2);
            await next();
            expect(title()).toBe('Account Settings');
            expect(nextButton()).toHaveTextContent('Got it!');
        });

        it('points at the hamburger on phones', async () => {
            addElement('<aside class="desktop-nav-rail"></aside>', ZERO_RECT);
            addElement('<button class="hamburger-toggle"></button>', rectAt(320, 10, 40, 40));
            await openTutorial('/parent/dashboard');

            await next();
            expect(title()).toBe('Account Settings');
            expect(cutout().getAttribute('x')).toBe(String(320 - 8));
        });
    });

    describe('card placement', () => {
        const cardStyle = () => document.querySelector('.spotlight-card').style;

        it('anchors the account card below the target, clamped to the viewport', async () => {
            window.innerWidth = 400;
            window.innerHeight = 800;
            addElement('<button class="hamburger-toggle"></button>', rectAt(340, 10, 40, 40));
            await openTutorial();
            await next();

            // bottom-left: right edge (380) - 280 = 100, kept inside the viewport.
            expect(cardStyle().top).toBe('70px');
            expect(cardStyle().left).toBe('100px');
        });

        it('keeps the card inside the viewport when the target is near an edge', async () => {
            window.innerWidth = 400;
            window.innerHeight = 300;
            addElement('<a class="stat-badge ducks"></a>', rectAt(360, 280, 30, 20));
            addElement('<button class="hamburger-toggle"></button>', rectAt(0, 0, 40, 40));
            await openTutorial();
            await next();

            expect(title()).toBe('Rewards');
            // bottom: centred under the badge, then pulled back inside the viewport.
            expect(cardStyle().left).toBe('100px');
            expect(cardStyle().top).toBe('60px');
        });

        it('pushes a card that would start left of the viewport back in', async () => {
            window.innerWidth = 1000;
            window.innerHeight = 800;
            addElement('<aside class="desktop-nav-rail"></aside>', rectAt(0, 0, 80, 600));
            await openTutorial();
            await next();

            // right edge (80) - 280 would be negative.
            expect(cardStyle().left).toBe('20px');
        });
    });
});
