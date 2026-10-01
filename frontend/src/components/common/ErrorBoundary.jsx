import React from 'react';

// Messages browsers / bundlers raise when a lazily loaded JS or CSS chunk cannot be fetched,
// typically after a deploy replaced the hashed files an open tab still points at:
// Chrome ("Failed to fetch dynamically imported module"), Safari ("Importing a module script
// failed"), Firefox ("error loading dynamically imported module") and Vite's CSS preload helper.
const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk/i;

const isChunkLoadError = (error) => CHUNK_ERROR_PATTERN.test(error?.message ?? '');

const resetKeysChanged = (prevKeys = [], nextKeys = []) =>
  prevKeys.length !== nextKeys.length || prevKeys.some((key, i) => !Object.is(key, nextKeys[i]));

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  textAlign: 'center',
  padding: '2rem',
};

const buttonStyle = {
  padding: '0.6rem 1.5rem',
  borderRadius: 'var(--radius-lg)',
  border: 'none',
  background: 'var(--primary-color)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 'var(--font-sm)',
  textDecoration: 'none',
};

const secondaryButtonStyle = {
  ...buttonStyle,
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-primary)',
};

// Router-free on purpose: the outermost boundary in main.jsx renders this outside <Router>,
// so "Go to home" is a plain link (full page load) rather than a react-router <Link>.
const DefaultFallback = ({ error, onRetry }) => {
  const chunkError = isChunkLoadError(error);

  return (
    <div role="alert" style={containerStyle}>
      <h2 style={{ margin: 0, fontSize: 'var(--font-2xl)' }}>
        {chunkError ? 'A new version is available' : 'Something went wrong'}
      </h2>
      <p style={{ opacity: 0.7, fontSize: 'var(--font-sm)', margin: 0 }}>
        {chunkError
          ? 'Please reload the page to get the latest update.'
          : 'An unexpected error occurred. You can try again, reload the page or go back to the home page.'}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!chunkError && (
          <button type="button" onClick={onRetry} style={buttonStyle}>
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={chunkError ? buttonStyle : secondaryButtonStyle}
        >
          Reload
        </button>
        {!chunkError && (
          <a href="/" style={secondaryButtonStyle}>
            Go to home
          </a>
        )}
      </div>
    </div>
  );
};

/**
 * Catches render errors below it so one broken component cannot white-screen the SPA.
 *
 * - Chunk-load failures (e.g. after a deploy) get a "new version available" prompt with Reload
 *   only: React.lazy caches the rejected import, so retrying in place would just fail again.
 *   We deliberately do not auto-reload from a `React.lazy` wrapper, which can loop forever.
 * - Any other error gets "Try again" (re-render the children), "Reload" and "Go to home".
 *
 * Props:
 * - `resetKeys`: array; the error state clears whenever any entry changes (e.g. the route path).
 * - `fallback`: optional replacement UI, either a node or `({ error, reset }) => node`.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('UI error caught by boundary:', error, info);
  }

  componentDidUpdate(prevProps, prevState) {
    // Only reset an error that was already showing before this update; a child that throws
    // in the very render triggered by new keys must show the fallback, not be retried once.
    if (this.state.hasError && prevState.hasError && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback({ error: this.state.error, reset: this.reset });
    }
    if (fallback != null) return fallback;
    return <DefaultFallback error={this.state.error} onRetry={this.reset} />;
  }
}

export default ErrorBoundary;
