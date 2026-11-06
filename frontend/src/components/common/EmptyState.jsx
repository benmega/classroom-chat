import React, { isValidElement } from 'react';
import './EmptyState.css';

/**
 * What a list, table or panel shows when there is nothing in it yet (or nothing matches).
 *
 *   icon         a lucide icon component (EmptyState icon={Inbox}) or an element; decorative, hidden from screen readers
 *   title        short statement of what is missing
 *   description  optional sentence on why, or what to do about it
 *   action       optional slot for the way out: a button or a link
 *   titleAs      heading tag for the title; pick the level that fits the page's outline (default h3)
 *   live         true when this appears in response to what the user just did (a search with no hits), so a
 *                screen reader announces it
 */
const EmptyState = ({ icon: Icon, title, description, action, titleAs = 'h3', live = false, className = '' }) => {
    const Title = titleAs;
    return (
        <div className={`ui-empty${className ? ` ${className}` : ''}`} role={live ? 'status' : undefined}>
            {Icon && (
                <span className="ui-empty__icon" aria-hidden="true">
                    {isValidElement(Icon) ? Icon : <Icon size={40} strokeWidth={1.5} />}
                </span>
            )}
            <Title className="ui-empty__title">{title}</Title>
            {description && <p className="ui-empty__description">{description}</p>}
            {action && <div className="ui-empty__action">{action}</div>}
        </div>
    );
};

export default EmptyState;
