import React, { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import useModalA11y, { getFocusable } from './useModalA11y';

// A minimal dialog: the hook only needs a container with tabIndex={-1} and the controls inside it.
const Dialog = ({ isOpen = true, onClose = () => {}, lockScroll, label = 'dialog', children }) => {
    const ref = useRef(null);
    useModalA11y({ isOpen, onClose, containerRef: ref, lockScroll });
    if (!isOpen) return null;
    return (
        <div ref={ref} tabIndex={-1} role="dialog" aria-label={label}>
            {children ?? (
                <>
                    <button>First</button>
                    <button>Last</button>
                </>
            )}
        </div>
    );
};

const press = (key, init = {}, target = document.activeElement || document.body) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
};

describe('useModalA11y', () => {
    afterEach(() => {
        document.body.style.overflow = '';
    });

    describe('initial focus', () => {
        it('moves focus to the first focusable control when it opens', () => {
            render(<Dialog />);

            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
        });

        it('focuses the dialog itself when it holds nothing focusable', () => {
            render(<Dialog><p>Just text</p></Dialog>);

            expect(screen.getByRole('dialog')).toHaveFocus();
        });

        it('focuses the dialog when it opens later, not before', () => {
            const { rerender } = render(<Dialog isOpen={false} />);
            expect(document.body).toHaveFocus();

            rerender(<Dialog isOpen />);

            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
        });

        it('keeps focus that is already inside the dialog (e.g. an autoFocus input)', () => {
            render(
                <Dialog>
                    <button>First</button>
                    {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                    <input aria-label="Name" autoFocus />
                </Dialog>
            );

            expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
        });

        it('focuses the control marked data-autofocus instead of the first one', () => {
            render(
                <Dialog>
                    <button>Close</button>
                    <button data-autofocus>Cancel</button>
                    <button>Delete</button>
                </Dialog>
            );

            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
        });

        it('still returns focus to the opener when it moved focus to a data-autofocus control', () => {
            const Page = ({ open }) => (
                <>
                    <button>Open dialog</button>
                    <Dialog isOpen={open}>
                        <button>Close</button>
                        <button data-autofocus>Cancel</button>
                    </Dialog>
                </>
            );
            const { rerender } = render(<Page open={false} />);
            const opener = screen.getByRole('button', { name: 'Open dialog' });
            opener.focus();

            rerender(<Page open />);
            expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
            rerender(<Page open={false} />);

            expect(opener).toHaveFocus();
        });

        it('falls back to the first control when the data-autofocus one is disabled', () => {
            render(
                <Dialog>
                    <button>First</button>
                    <button data-autofocus disabled>Cancel</button>
                </Dialog>
            );

            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
        });
    });

    describe('Escape', () => {
        it('calls onClose', () => {
            const onClose = vi.fn();
            render(<Dialog onClose={onClose} />);

            press('Escape');

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('calls the latest onClose without taking focus back again', async () => {
            const user = userEvent.setup();
            const first = vi.fn();
            const second = vi.fn();
            const { rerender } = render(
                <Dialog onClose={first}>
                    <button>First</button>
                    <button>Last</button>
                </Dialog>
            );
            await user.tab();
            expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

            rerender(
                <Dialog onClose={second}>
                    <button>First</button>
                    <button>Last</button>
                </Dialog>
            );
            press('Escape');

            expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledTimes(1);
        });

        it('does nothing when an inner widget already used the key', () => {
            const onClose = vi.fn();
            render(
                <Dialog onClose={onClose}>
                    <input aria-label="Search" onKeyDown={(e) => e.preventDefault()} />
                </Dialog>
            );

            const event = press('Escape');

            expect(event.defaultPrevented).toBe(true);
            expect(onClose).not.toHaveBeenCalled();
        });

        it('copes with a missing onClose', () => {
            render(<Dialog onClose={undefined} />);

            expect(() => press('Escape')).not.toThrow();
        });

        it('stops listening once closed', () => {
            const onClose = vi.fn();
            const { rerender } = render(<Dialog onClose={onClose} />);
            rerender(<Dialog onClose={onClose} isOpen={false} />);

            press('Escape');

            expect(onClose).not.toHaveBeenCalled();
        });

        it('ignores other keys', () => {
            const onClose = vi.fn();
            render(<Dialog onClose={onClose} />);

            press('Enter');
            press('a');

            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('Tab trap', () => {
        it('wraps from the last control to the first', async () => {
            const user = userEvent.setup();
            render(<Dialog />);

            await user.tab();
            expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
            await user.tab();

            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
        });

        it('wraps from the first control to the last with Shift+Tab', async () => {
            const user = userEvent.setup();
            render(<Dialog />);
            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

            await user.tab({ shift: true });

            expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
        });

        it('lets Tab move normally between the controls in the middle', async () => {
            const user = userEvent.setup();
            render(
                <Dialog>
                    <button>One</button>
                    <button>Two</button>
                    <button>Three</button>
                </Dialog>
            );

            await user.tab();

            expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus();
            const event = press('Tab');
            expect(event.defaultPrevented).toBe(false);
        });

        it('pulls focus back in when it is on nothing or on the dialog itself', () => {
            render(<Dialog />);
            const dialog = screen.getByRole('dialog');

            document.activeElement.blur();
            expect(document.body).toHaveFocus();
            expect(press('Tab').defaultPrevented).toBe(true);
            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();

            document.activeElement.blur();
            expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
            expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

            dialog.focus();
            press('Tab', { shiftKey: true });
            expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

            dialog.focus();
            press('Tab');
            expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
        });

        it('leaves Tab alone while focus is in another dialog stacked on top of it', () => {
            render(
                <>
                    <Dialog />
                    <div role="dialog" aria-label="confirm">
                        <button>Confirm</button>
                    </div>
                </>
            );
            const confirm = screen.getByRole('button', { name: 'Confirm' });
            confirm.focus();

            const event = press('Tab');

            expect(event.defaultPrevented).toBe(false);
            expect(confirm).toHaveFocus();
        });

        it('keeps focus on the dialog when it holds nothing focusable', () => {
            render(<Dialog><p>Just text</p></Dialog>);

            const event = press('Tab');

            expect(event.defaultPrevented).toBe(true);
            expect(screen.getByRole('dialog')).toHaveFocus();
        });

        it('treats only the controls that can take focus as the edges of the trap', () => {
            render(
                <Dialog>
                    <button>Start</button>
                    <button disabled>Disabled</button>
                    <button tabIndex={-1}>Not in the tab order</button>
                    <input type="hidden" defaultValue="x" />
                    <div hidden><button>Hidden attribute</button></div>
                    <div style={{ display: 'none' }}><button>Display none</button></div>
                    <button style={{ visibility: 'hidden' }}>Visibility hidden</button>
                    <button>End</button>
                </Dialog>
            );

            expect(getFocusable(screen.getByRole('dialog')).map((el) => el.textContent)).toEqual(['Start', 'End']);

            // The browser would walk through the skipped controls; the trap wraps at the real edges.
            screen.getByRole('button', { name: 'End' }).focus();
            press('Tab');
            expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus();
            press('Tab', { shiftKey: true });
            expect(screen.getByRole('button', { name: 'End' })).toHaveFocus();
        });

        it('counts links, inputs, selects, textareas and tabindex=0 elements', () => {
            render(
                <Dialog>
                    <a href="/somewhere">Link</a>
                    {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                    <a>Not a link</a>
                    <input aria-label="Name" />
                    <select aria-label="Pick"><option>1</option></select>
                    <textarea aria-label="Notes" />
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                    <div tabIndex={0}>Custom</div>
                </Dialog>
            );

            expect(getFocusable(screen.getByRole('dialog'))).toHaveLength(5);
        });
    });

    describe('focus return', () => {
        it('gives focus back to the opener on close', () => {
            const opener = document.createElement('button');
            document.body.appendChild(opener);
            opener.focus();
            const { rerender } = render(<Dialog />);
            expect(opener).not.toHaveFocus();

            rerender(<Dialog isOpen={false} />);

            expect(opener).toHaveFocus();
            opener.remove();
        });

        it('gives focus back to the opener when the dialog is unmounted', () => {
            const opener = document.createElement('button');
            document.body.appendChild(opener);
            opener.focus();
            const { unmount } = render(<Dialog />);

            unmount();

            expect(opener).toHaveFocus();
            opener.remove();
        });

        it('does not try to focus an opener that has left the page', () => {
            const opener = document.createElement('button');
            document.body.appendChild(opener);
            opener.focus();
            const focus = vi.spyOn(opener, 'focus');
            const { unmount } = render(<Dialog />);
            opener.remove();
            focus.mockClear();

            unmount();

            expect(focus).not.toHaveBeenCalled();
        });

        it('has nothing to return to when nothing had focus before', () => {
            const { rerender } = render(<Dialog />);

            rerender(<Dialog isOpen={false} />);

            expect(document.body).toHaveFocus();
        });
    });

    describe('nested dialogs', () => {
        it('lets only the innermost dialog react to Escape', () => {
            const closeOuter = vi.fn();
            const closeInner = vi.fn();
            render(
                <>
                    <Dialog onClose={closeOuter} label="outer" />
                    <Dialog onClose={closeInner} label="inner" />
                </>
            );

            press('Escape');

            expect(closeInner).toHaveBeenCalledTimes(1);
            expect(closeOuter).not.toHaveBeenCalled();
        });

        it('hands the keyboard back to the outer dialog once the inner one closes', () => {
            const closeOuter = vi.fn();
            const { rerender } = render(
                <>
                    <Dialog onClose={closeOuter} label="outer" />
                    <Dialog onClose={() => {}} label="inner" />
                </>
            );

            rerender(
                <>
                    <Dialog onClose={closeOuter} label="outer" />
                    <Dialog onClose={() => {}} label="inner" isOpen={false} />
                </>
            );
            press('Escape');

            expect(closeOuter).toHaveBeenCalledTimes(1);
        });

        it('keeps Tab inside the innermost dialog', () => {
            render(
                <>
                    <Dialog label="outer">
                        <button>Outer first</button>
                        <button>Outer last</button>
                    </Dialog>
                    <Dialog label="inner">
                        <button>Inner only</button>
                    </Dialog>
                </>
            );
            const innerButton = screen.getByRole('button', { name: 'Inner only' });
            expect(innerButton).toHaveFocus();

            const event = press('Tab');

            expect(event.defaultPrevented).toBe(true);
            expect(innerButton).toHaveFocus();
        });
    });

    describe('scroll lock', () => {
        it('does not touch the page scroll by default', () => {
            document.body.style.overflow = 'auto';
            render(<Dialog />);

            expect(document.body.style.overflow).toBe('auto');
        });

        it('locks the page scroll while open and restores it on close', () => {
            document.body.style.overflow = 'auto';
            const { rerender } = render(<Dialog lockScroll />);
            expect(document.body.style.overflow).toBe('hidden');

            rerender(<Dialog lockScroll isOpen={false} />);

            expect(document.body.style.overflow).toBe('auto');
        });
    });

    it('does nothing at all while closed', () => {
        const onClose = vi.fn();
        render(<Dialog isOpen={false} onClose={onClose} lockScroll />);

        fireEvent.keyDown(document, { key: 'Escape' });

        expect(onClose).not.toHaveBeenCalled();
        expect(document.body.style.overflow).toBe('');
    });
});
