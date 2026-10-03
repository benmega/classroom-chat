import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * In-content Suspense fallback for the layouts. Unlike App's full-viewport
 * PageLoader it only fills the content area, so the nav rail / sidebar stay
 * mounted and visible while a lazy page chunk loads.
 */
const ContentLoader = () => (
  <div
    role="status"
    aria-label="Loading page"
    style={{
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '40vh',
      width: '100%',
    }}
  >
    <Loader2 style={{ animation: 'spin 1s linear infinite', color: 'var(--blue-600)' }} size={40} strokeWidth={1.5} />
  </div>
);

export default ContentLoader;
