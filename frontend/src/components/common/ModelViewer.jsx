import React, { forwardRef, useImperativeHandle } from 'react';

// STUB from the fe-editor lane. The real viewer belongs to the fe-viewer lane (contract 4.2) and replaces this
// file when the lanes are merged. It draws nothing, never calls onLoad, and its snapshot resolves a tiny blob.
const ModelViewer = forwardRef(({ ariaLabel, className = '', style }, ref) => {
    useImperativeHandle(ref, () => ({
        snapshot: () => Promise.resolve(new Blob(['stub'], { type: 'image/png' })),
        reset: () => {},
    }), []);

    return (
        <div
            data-testid="model-viewer-stub"
            className={`model-viewer ${className}`.trim()}
            style={style}
            role="img"
            aria-label={ariaLabel}
        />
    );
});

ModelViewer.displayName = 'ModelViewer';

export default ModelViewer;
