import React from 'react';
import './Skeleton.css';

// A grey placeholder block. It says nothing on its own, so it is hidden from assistive technology: the
// SkeletonGroup around a set of them is what announces that the content is loading.
const Skeleton = ({ width, height, borderRadius, className, style = {}, ...rest }) => {
  const combinedStyle = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: borderRadius || '4px',
    ...style
  };

  return <div className={`skeleton-loader ${className || ''}`} style={combinedStyle} aria-hidden="true" {...rest}></div>;
};

/**
 * The container for a set of skeletons: a polite status region marked aria-busy, with the text a screen reader
 * announces (visually hidden). Give it the layout classes the skeletons sit in.
 */
export const SkeletonGroup = ({ label = 'Loading…', className, children, ...rest }) => (
  <div role="status" aria-busy="true" className={className} {...rest}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

export default Skeleton;
