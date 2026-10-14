import React from 'react';

// STUB created by the fe-display lane. The fe-filebrowser lane owns this component (CONTRACT.md 4.3) and the
// integrator replaces this file with theirs.
const ProjectFileBrowser = ({ files }) => (
    (files || []).some((file) => file.kind === 'source') ? <div data-testid="project-file-browser-stub" /> : null
);

export default ProjectFileBrowser;
