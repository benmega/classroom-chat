import { useEffect, useRef } from 'react';

// Controls a keyboard user can Tab to. Disabled ones and ones taken out of the tab order are skipped.
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[tabindex]',
].map((selector) => `${selector}:not([disabled]):not([tabindex="-1"])`).join(',');

// The modals that are open right now, innermost last. Only the innermost one reacts to the
// keyboard, so Escape closes one modal at a time and Tab cannot jump into the one underneath.
const openModals = [];

// A control inside a display:none / hidden subtree (or with visibility:hidden) cannot take focus.
const isShown = (el, container) => {
    if (window.getComputedStyle(el).visibility === 'hidden') return false;
    for (let node = el; node && node !== container.parentElement; node = node.parentElement) {
        if (node.hidden || window.getComputedStyle(node).display === 'none') return false;
    }
    return true;
};

export const getFocusable = (container) => (
    Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => isShown(el, container))
);

/**
 * Keyboard behaviour shared by the modal dialogs.
 *
 * While `isOpen`: Escape calls `onClose` (innermost modal only, and not when an inner widget such as an
 * open combobox already used the key and called preventDefault), Tab and Shift+Tab stay inside
 * `containerRef`, focus moves into the dialog, and it returns to the element that opened it on close.
 * `lockScroll` also stops the page behind from scrolling.
 *
 * The container needs tabIndex={-1} so it can take focus when it holds nothing focusable.
 */
const useModalA11y = ({ isOpen, onClose, containerRef, lockScroll = false }) => {
    // The key handler must always call the latest onClose without re-running the effect (and re-grabbing focus).
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const container = containerRef.current;
        const token = {};
        openModals.push(token);

        const handleKeyDown = (e) => {
            if (openModals[openModals.length - 1] !== token) return;

            if (e.key === 'Escape') {
                if (!e.defaultPrevented && onCloseRef.current) onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab') return;

            const dialog = containerRef.current;
            if (!dialog) return;
            const focusable = getFocusable(dialog);
            if (focusable.length === 0) {
                e.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            // Focus on the dialog itself or on nothing (e.g. after a click on plain text) re-enters at the edge.
            // Focus on any other element outside is left alone: it may be a dialog stacked on top of this one.
            const adrift = !active || active === document.body || active === dialog;
            if (e.shiftKey) {
                if (active === first || adrift) {
                    e.preventDefault();
                    last.focus();
                }
            } else if (active === last || adrift) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        // Remember the opener only when focus was not already moved into the dialog (e.g. by autoFocus).
        const active = document.activeElement;
        const opener = container && container.contains(active) ? null : active;
        if (container && !container.contains(active)) {
            const focusable = getFocusable(container);
            (focusable[0] || container).focus();
        }

        let originalOverflow;
        if (lockScroll) {
            originalOverflow = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            openModals.splice(openModals.indexOf(token), 1);
            if (lockScroll) document.body.style.overflow = originalOverflow;
            if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') {
                opener.focus();
            }
        };
    }, [isOpen, lockScroll, containerRef]);
};

export default useModalA11y;
