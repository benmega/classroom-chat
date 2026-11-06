import { useEffect } from 'react';

export const APP_NAME = 'Classroom Chat';

/** "Chat" becomes "Chat · Classroom Chat"; no title gives the bare product name. */
export const formatDocumentTitle = (title) => (title ? `${title} · ${APP_NAME}` : APP_NAME);

/**
 * Sets the browser tab title (and so the first thing a screen reader says about a page, WCAG 2.4.2) while the
 * calling page is mounted, and puts back the previous one when it unmounts. A single-page app has one static
 * <title> in index.html, so without this every route is called "Classroom Chat".
 *
 * Pass `enabled = false` for a page that can also be embedded in another one (the chat feed inside the class
 * dashboard) and should leave the host page's title alone.
 */
const useDocumentTitle = (title, enabled = true) => {
    useEffect(() => {
        if (!enabled) return undefined;
        const previous = document.title;
        document.title = formatDocumentTitle(title);
        return () => {
            document.title = previous;
        };
    }, [title, enabled]);
};

export default useDocumentTitle;
