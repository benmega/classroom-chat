import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

// Throws while `shouldThrow.current` is truthy, so a test can "fix" the child before retrying.
const shouldThrow = { current: null };
const Bomb = () => {
  if (shouldThrow.current) throw shouldThrow.current;
  return <div>Child rendered fine</div>;
};

describe('ErrorBoundary', () => {
  let consoleError;

  beforeEach(() => {
    shouldThrow.current = null;
    // React and the boundary both log caught render errors; keep test output clean.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Child rendered fine')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a generic recoverable fallback when a child throws', () => {
    shouldThrow.current = new Error('boom');

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('A new version is available')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
    expect(consoleError).toHaveBeenCalledWith(
      'UI error caught by boundary:',
      expect.objectContaining({ message: 'boom' }),
      expect.anything()
    );
  });

  it('treats a thrown non-Error value as an ordinary error', () => {
    shouldThrow.current = 'plain string';

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it.each([
    'Failed to fetch dynamically imported module: https://example.com/assets/Chat-abc123.js',
    'error loading dynamically imported module: https://example.com/assets/Chat-abc123.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/Chat-abc123.css',
    'Loading chunk 42 failed.',
    'ChunkLoadError: something',
  ])('shows the new-version prompt (reload only) for chunk-load error "%s"', (message) => {
    shouldThrow.current = new Error(message);

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('A new version is available')).toBeInTheDocument();
    expect(screen.getByText('Please reload the page to get the latest update.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    // Retrying in place cannot help: React.lazy keeps the rejected import.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to home' })).not.toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('"Try again" re-renders the children and recovers once they no longer throw', async () => {
    shouldThrow.current = new Error('boom');

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    shouldThrow.current = null;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Child rendered fine')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('"Try again" shows the fallback again if the child still throws', async () => {
    shouldThrow.current = new Error('boom');

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('"Reload" reloads the page', async () => {
    shouldThrow.current = new Error('boom');
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    });

    try {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      );
      await userEvent.click(screen.getByRole('button', { name: 'Reload' }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    }
  });

  describe('resetKeys', () => {
    const renderWithKeys = (keys) => (
      <ErrorBoundary resetKeys={keys}>
        <Bomb />
      </ErrorBoundary>
    );

    it('clears the error when a reset key changes', () => {
      shouldThrow.current = new Error('boom');
      const { rerender } = render(renderWithKeys(['/broken']));
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      shouldThrow.current = null;
      rerender(renderWithKeys(['/fixed']));

      expect(screen.getByText('Child rendered fine')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('clears the error when the number of reset keys changes', () => {
      shouldThrow.current = new Error('boom');
      const { rerender } = render(renderWithKeys(['/broken']));

      shouldThrow.current = null;
      rerender(renderWithKeys(['/broken', 'extra']));

      expect(screen.getByText('Child rendered fine')).toBeInTheDocument();
    });

    it('keeps the fallback while the reset keys are unchanged', () => {
      shouldThrow.current = new Error('boom');
      const { rerender } = render(renderWithKeys(['/broken']));

      shouldThrow.current = null;
      rerender(renderWithKeys(['/broken']));

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Child rendered fine')).not.toBeInTheDocument();
    });

    it('does not reset when no reset keys are provided', () => {
      shouldThrow.current = new Error('boom');
      const { rerender } = render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      );

      shouldThrow.current = null;
      rerender(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows the fallback (without a retry render) when the child throws in the render caused by new keys', () => {
      const { rerender } = render(renderWithKeys(['/ok']));
      expect(screen.getByText('Child rendered fine')).toBeInTheDocument();
      consoleError.mockClear();

      shouldThrow.current = new Error('boom');
      rerender(renderWithKeys(['/crashes']));

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      // One caught error -> one boundary log; a spurious reset+retry would log it twice.
      const boundaryLogs = consoleError.mock.calls.filter(([msg]) => msg === 'UI error caught by boundary:');
      expect(boundaryLogs).toHaveLength(1);
    });
  });

  describe('fallback prop', () => {
    it('renders a custom fallback node instead of the default UI', () => {
      shouldThrow.current = new Error('boom');

      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <Bomb />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom fallback')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('calls a fallback function with the error and a working reset', async () => {
      shouldThrow.current = new Error('custom boom');

      render(
        <ErrorBoundary
          fallback={({ error, reset }) => (
            <button type="button" onClick={reset}>
              Retry {error.message}
            </button>
          )}
        >
          <Bomb />
        </ErrorBoundary>
      );

      shouldThrow.current = null;
      await userEvent.click(screen.getByRole('button', { name: 'Retry custom boom' }));

      expect(screen.getByText('Child rendered fine')).toBeInTheDocument();
    });
  });
});
