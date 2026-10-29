import React from 'react';
import { MAIN_CONTENT_ID } from '../Layout/layoutIds';

/**
 * "Skip to content": the first control in the tab order, visible only while it has focus (styles in index.css).
 * It moves focus to the <main> element itself rather than following the hash, which would add #main-content
 * to the URL and leave the router with a location it did not navigate to.
 */
const SkipLink = ({ targetRef }) => (
    <a
        className="skip-link"
        href={`#${MAIN_CONTENT_ID}`}
        onClick={(e) => {
            const main = targetRef?.current;
            if (!main) return; // no target to focus: let the browser follow the hash
            e.preventDefault();
            main.focus();
            main.scrollIntoView?.();
        }}
    >
        Skip to content
    </a>
);

export default SkipLink;
