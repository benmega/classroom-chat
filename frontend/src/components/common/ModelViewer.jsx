import React from 'react';

// STUB. The real viewer belongs to lane fe-viewer (contract 4.2); the integrator replaces this file with the
// owner's version, so it renders a marker only and ignores every prop.
const ModelViewer = React.forwardRef(function ModelViewer(_props, _ref) {
    return <div data-testid="model-viewer-stub" role="img" />;
});

export default ModelViewer;
