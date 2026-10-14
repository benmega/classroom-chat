import React from 'react';

// STUB created by the fe-display lane. The fe-filebrowser lane owns this component (CONTRACT.md 4.3) and the
// integrator replaces this file with theirs.
const AssetGallery = ({ files }) => (
    (files || []).some((file) => file.kind === 'asset') ? <div data-testid="asset-gallery-stub" /> : null
);

export default AssetGallery;
