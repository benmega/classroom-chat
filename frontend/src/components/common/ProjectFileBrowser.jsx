import React from 'react';
import { groupProjectFiles } from '../../utils/projectFiles';

// STUB. The real browser belongs to lane fe-filebrowser (contract 4.3); the integrator replaces this file with the
// owner's version, so it renders a marker only.
const ProjectFileBrowser = ({ files }) => {
    if (groupProjectFiles(files).sources.length === 0) return null;
    return <div data-testid="project-file-browser-stub" />;
};

export default ProjectFileBrowser;
