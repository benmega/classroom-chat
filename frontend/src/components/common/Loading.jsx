import React from 'react';
import { Loader2 } from 'lucide-react';
import './Loading.css';

const ICON_SIZE = { inline: 16, block: 32, fullpage: 48 };

/**
 * A loading indicator that is announced. The spinner is decoration; the label is what a screen reader hears
 * (role="status" is a polite live region), visually hidden unless `showLabel` is set.
 *
 *   variant="block"    (default) centred in the space it is given
 *   variant="inline"   a small spinner in the flow of a line of text or inside a button
 *   variant="fullpage" fills the viewport, for a page that has nothing to show yet
 *
 * The spinner takes its colour from `--loading-color` (the primary colour unless a screen overrides it).
 * For a placeholder shaped like the content that is coming, use Skeleton / SkeletonGroup instead.
 */
const Loading = ({ label = 'Loading…', variant = 'block', showLabel = false, size, className = '' }) => {
    const Tag = variant === 'inline' ? 'span' : 'div';
    return (
        <Tag role="status" className={`ui-loading ui-loading--${variant}${className ? ` ${className}` : ''}`}>
            <Loader2 className="ui-loading__spinner" size={size ?? ICON_SIZE[variant] ?? ICON_SIZE.block} aria-hidden="true" />
            <span className={showLabel ? 'ui-loading__label' : 'sr-only'}>{label}</span>
        </Tag>
    );
};

export default Loading;
