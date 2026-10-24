import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DiagramFrame from './DiagramFrame';
import diagramStyles from './quizDiagramStyles';

let observers;

class FakeResizeObserver {
    constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
    }
}

// happy-dom does not lay out iframes, so give the frame a document whose body reports a height.
const giveContent = (frame, getHeight) => {
    const body = { getBoundingClientRect: () => ({ height: getHeight() }), scrollHeight: 0 };
    Object.defineProperty(frame, 'contentDocument', { configurable: true, value: { body } });
    return body;
};

describe('DiagramFrame', () => {
    beforeEach(() => {
        observers = [];
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each([undefined, null, ''])('renders nothing for empty html (%s)', (html) => {
        const { container } = render(<DiagramFrame html={html} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('is a script-free sandbox with an accessible title', () => {
        render(<DiagramFrame html="<p>hi</p>" title="Question 3 diagram" />);

        const frame = screen.getByTitle('Question 3 diagram');
        expect(frame.tagName).toBe('IFRAME');
        expect(frame.getAttribute('sandbox')).toBe('allow-same-origin');
        expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');
    });

    it('defaults the title to Diagram', () => {
        render(<DiagramFrame html="<p>hi</p>" />);
        expect(screen.getByTitle('Diagram')).toBeInTheDocument();
    });

    it('puts the diagram styles and the html into the frame document', () => {
        render(<DiagramFrame html='<svg id="d"></svg>' />);

        const doc = screen.getByTitle('Diagram').getAttribute('srcdoc');
        expect(doc).toContain(diagramStyles);
        expect(doc).toContain('<body><svg id="d"></svg></body>');
        expect(doc).toContain('background:transparent');
    });

    it('sizes the frame to its content on load', () => {
        render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        giveContent(frame, () => 212.4);

        fireEvent.load(frame);

        expect(frame.style.height).toBe('213px');
    });

    it('never collapses below a minimum height', () => {
        render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        giveContent(frame, () => 0);

        fireEvent.load(frame);

        expect(frame.style.height).toBe('40px');
    });

    it('follows later content resizes through a ResizeObserver on the body', () => {
        render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        let height = 100;
        const body = giveContent(frame, () => height);

        fireEvent.load(frame);
        expect(observers).toHaveLength(1);
        expect(observers[0].observe).toHaveBeenCalledWith(body);
        expect(frame.style.height).toBe('100px');

        height = 320;
        act(() => observers[0].callback());
        expect(frame.style.height).toBe('320px');
    });

    it('replaces the observer when the frame reloads and disconnects on unmount', () => {
        const { unmount } = render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        giveContent(frame, () => 100);

        fireEvent.load(frame);
        fireEvent.load(frame);
        expect(observers).toHaveLength(2);
        expect(observers[0].disconnect).toHaveBeenCalled();
        expect(observers[1].disconnect).not.toHaveBeenCalled();

        unmount();
        expect(observers[1].disconnect).toHaveBeenCalled();
    });

    it('survives a frame without an accessible document', () => {
        render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        Object.defineProperty(frame, 'contentDocument', { configurable: true, value: null });

        expect(() => fireEvent.load(frame)).not.toThrow();
        expect(observers).toHaveLength(0);
    });

    it('still sizes the frame when ResizeObserver is unavailable', () => {
        vi.stubGlobal('ResizeObserver', undefined);
        render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        giveContent(frame, () => 150);

        fireEvent.load(frame);

        expect(frame.style.height).toBe('150px');
    });

    it('falls back to scrollHeight when the body reports no box', () => {
        render(<DiagramFrame html="<p>hi</p>" />);
        const frame = screen.getByTitle('Diagram');
        const body = giveContent(frame, () => 0);
        body.scrollHeight = 90;

        fireEvent.load(frame);

        expect(frame.style.height).toBe('90px');
    });
});
