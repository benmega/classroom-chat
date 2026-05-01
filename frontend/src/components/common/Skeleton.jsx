import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius, className, style = {} }) => {
  const combinedStyle = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: borderRadius || '4px',
    ...style
  };

  return <div className={`skeleton-loader ${className || ''}`} style={combinedStyle}></div>;
};

export default Skeleton;
