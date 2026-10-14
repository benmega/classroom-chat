import React, { forwardRef } from 'react';

// STUB created by the fe-display lane. The fe-viewer lane owns this component (CONTRACT.md 4.2) and the
// integrator replaces this file with theirs.
const ModelViewer = forwardRef(({ ariaLabel }, _ref) => (
    <div data-testid="model-viewer-stub" role="img" aria-label={ariaLabel} />
));

ModelViewer.displayName = 'ModelViewer';

export default ModelViewer;
