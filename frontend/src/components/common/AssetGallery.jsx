import React from 'react';
import { groupProjectFiles } from '../../utils/projectFiles';

// STUB. The real gallery belongs to lane fe-filebrowser (contract 4.3); the integrator replaces this file with the
// owner's version, so it renders a marker only.
const AssetGallery = ({ files }) => {
    if (groupProjectFiles(files).assets.length === 0) return null;
    return <div data-testid="asset-gallery-stub" />;
};

export default AssetGallery;
