import React, {
    forwardRef,
    useEffect,
    useId,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { Box, Download, Loader2, Rotate3d } from 'lucide-react';
import { MODEL_MIME_TYPES, modelFormatFromName } from '../../utils/modelFormats';
import './ModelViewer.css';

const NO_SOURCE = 'No model file was given.';
const UNSUPPORTED = 'This file type cannot be shown in 3D.';
const NOT_LOADED = 'The model has not finished loading yet.';
// Anything the engine did not explain itself, including a failed download of the viewer code.
const START_FAILED = 'The 3D viewer could not be started. Reload the page to try again.';

const ROTATE_STEP = Math.PI / 12; // 15 degrees per key press

// Arrow keys move the camera around the model in the direction of the arrow.
const KEY_ACTIONS = new Map([
    ['ArrowLeft', (viewer) => viewer.rotate(-ROTATE_STEP, 0)],
    ['ArrowRight', (viewer) => viewer.rotate(ROTATE_STEP, 0)],
    ['ArrowUp', (viewer) => viewer.rotate(0, ROTATE_STEP)],
    ['ArrowDown', (viewer) => viewer.rotate(0, -ROTATE_STEP)],
    ['+', (viewer) => viewer.zoom(1)],
    ['=', (viewer) => viewer.zoom(1)],
    ['-', (viewer) => viewer.zoom(-1)],
    ['_', (viewer) => viewer.zoom(-1)],
    ['Home', (viewer) => viewer.reset()],
    ['0', (viewer) => viewer.reset()],
]);

// The engine names its errors the same way, so onError always gets an Error whose message can be shown.
const viewerError = (message, cause) => {
    const error = new Error(message, cause === undefined ? undefined : { cause });
    error.name = 'ModelViewerError';
    return error;
};

const toViewerError = (err) => (err && err.name === 'ModelViewerError' ? err : viewerError(START_FAILED, err));

// An explicit format wins (an unsupported one included); without one, the file name, then the URL.
const resolveFormat = (format, filename, src) => {
    if (typeof format === 'string' && format.trim()) {
        const value = format.trim().toLowerCase().replace(/^\./, '');
        return Object.prototype.hasOwnProperty.call(MODEL_MIME_TYPES, value) ? value : null;
    }
    return modelFormatFromName(filename) || modelFormatFromName(src);
};

// Read through useSyncExternalStore, so a viewer that is already open follows a change of the setting.
const mediaQuery = (query) => ({
    subscribe: (onChange) => {
        if (typeof window.matchMedia !== 'function') return () => {};
        const list = window.matchMedia(query);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    },
    getSnapshot: () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
});
const REDUCED_MOTION = mediaQuery('(prefers-reduced-motion: reduce)');
const COARSE_POINTER = mediaQuery('(pointer: coarse)');
const useMediaQuery = ({ subscribe, getSnapshot }) => useSyncExternalStore(subscribe, getSnapshot, () => false);

const loadingState = (key) => ({ key, status: 'loading', progress: null, error: null });

// One import of the three.js code for every viewer on the page. A failed one (a lost connection, or a
// chunk that a new deployment replaced) is forgotten, so the next viewer can try again.
let enginePromise = null;
const loadEngine = () => {
    if (!enginePromise) {
        enginePromise = import('./modelViewerEngine').catch((err) => {
            enginePromise = null;
            throw err;
        });
    }
    return enginePromise;
};

/**
 * An interactive 3D view of a model file (STL, OBJ, GLB, glTF, 3MF, PLY). three.js is loaded on first use.
 * While loading it shows a spinner (with a percentage when the size is known); when the model cannot be
 * shown (no WebGL, unreadable file) it says so and offers `downloadUrl`.
 *
 * The ref exposes snapshot({ width, height, type }) => Promise<Blob> and reset().
 */
const ModelViewer = forwardRef(function ModelViewer({
    src,
    filename,
    format,
    className,
    style,
    autoRotate = true,
    interactive = true,
    ariaLabel,
    onLoad,
    onError,
    downloadUrl,
    compact = false,
}, ref) {
    const stageRef = useRef(null);
    const viewerRef = useRef(null);
    const messageId = useId();
    const prefersReducedMotion = useMediaQuery(REDUCED_MOTION);
    const coarsePointer = useMediaQuery(COARSE_POINTER);
    const rotates = Boolean(autoRotate) && !prefersReducedMotion;

    const resolvedFormat = resolveFormat(format, filename, src);
    // Problems the props alone reveal: nothing is downloaded (or loaded) for them.
    const setupError = useMemo(() => {
        if (!src) return viewerError(NO_SOURCE);
        if (!resolvedFormat) return viewerError(UNSUPPORTED);
        return null;
    }, [src, resolvedFormat]);

    // A new model (or a switch of interactivity) starts a new load; its state is tagged with this key,
    // so a result for an earlier model can never be shown for the current one.
    const loadKey = `${src}\n${resolvedFormat}\n${interactive}`;
    const [load, setLoad] = useState(() => loadingState(loadKey));
    if (load.key !== loadKey) setLoad(loadingState(loadKey));
    const { status, progress, error } = setupError
        ? { status: 'error', progress: null, error: setupError }
        : (load.key === loadKey ? load : loadingState(loadKey));

    // The load reads the newest callbacks and rotation setting without restarting when they change.
    // Not useEffectEvent: React 19.2 only refreshes those in plain function components, and this one is
    // a forwardRef, so it would keep calling the callbacks of its first render.
    const latest = useRef({ onLoad, onError, rotates });
    useLayoutEffect(() => {
        latest.current = { onLoad, onError, rotates };
    });

    useEffect(() => {
        if (setupError) {
            latest.current.onError?.(setupError);
            return undefined;
        }
        const stage = stageRef.current;
        const controller = new AbortController();
        const { signal } = controller;
        let viewer = null;
        const update = (next) => setLoad((prev) => (prev.key === loadKey ? { ...prev, ...next } : prev));

        loadEngine()
            .then(({ createModelViewer }) => createModelViewer(stage, {
                src,
                format: resolvedFormat,
                autoRotate: latest.current.rotates,
                interactive,
                signal,
                onProgress: (fraction) => {
                    const percent = Math.round(fraction * 100);
                    // Re-render only when the shown number changes, not for every downloaded chunk.
                    setLoad((prev) => (
                        prev.key === loadKey && prev.status === 'loading' && prev.progress !== percent
                            ? { ...prev, progress: percent }
                            : prev
                    ));
                },
            }))
            .then((handle) => {
                if (signal.aborted) {
                    handle.dispose();
                    return;
                }
                viewer = handle;
                viewerRef.current = handle;
                update({ status: 'ready', progress: null, error: null });
                latest.current.onLoad?.({ format: resolvedFormat });
            })
            .catch((err) => {
                if (signal.aborted) return;
                const failure = toViewerError(err);
                update({ status: 'error', progress: null, error: failure });
                latest.current.onError?.(failure);
            });

        return () => {
            controller.abort();
            if (viewer) viewer.dispose();
            if (viewerRef.current === viewer) viewerRef.current = null;
        };
    }, [loadKey, setupError, src, resolvedFormat, interactive]);

    const isReady = status === 'ready';
    useEffect(() => {
        if (isReady) viewerRef.current?.setAutoRotate(rotates);
    }, [isReady, rotates]);

    useImperativeHandle(ref, () => ({
        snapshot: ({ width = 1200, height = 675, type = 'image/png' } = {}) => {
            const viewer = viewerRef.current;
            if (!viewer) return Promise.reject(viewerError(NOT_LOADED));
            return viewer.snapshot({ width, height, type });
        },
        reset: () => {
            viewerRef.current?.reset();
        },
    }), []);

    const canInteract = isReady && interactive;
    const handleKeyDown = (event) => {
        // Modified keys belong to the browser (Ctrl and + zooms the page).
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const action = KEY_ACTIONS.get(event.key);
        const viewer = viewerRef.current;
        if (!action || !viewer) return;
        // Arrow keys would otherwise scroll the page while the model turns.
        event.preventDefault();
        action(viewer);
    };

    const label = ariaLabel || (filename ? `3D model: ${filename}` : '3D model');
    const classes = [
        'model-viewer',
        `model-viewer--${status}`,
        compact ? 'model-viewer--compact' : '',
        className || '',
    ].filter(Boolean).join(' ');

    return (
        // role="img" (the contract) keeps a screen reader on the label; the element itself takes keyboard
        // focus once the model can be turned, so the arrow keys work without a pointer.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            className={classes}
            style={style}
            role="img"
            aria-label={label}
            aria-busy={status === 'loading' || undefined}
            aria-describedby={status === 'error' ? messageId : undefined}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={canInteract ? 0 : undefined}
            onKeyDown={canInteract ? handleKeyDown : undefined}
        >
            <div ref={stageRef} className="model-viewer__stage" />

            {status === 'loading' && (
                <div className="model-viewer__overlay model-viewer__loading">
                    <Loader2 className="model-viewer__spinner" size={compact ? 20 : 28} aria-hidden="true" />
                    <span>{progress === null ? 'Loading 3D model…' : `Loading 3D model… ${progress}%`}</span>
                </div>
            )}

            {canInteract && (
                <>
                    <p className="model-viewer__hint">
                        <Rotate3d size={14} aria-hidden="true" />
                        {coarsePointer ? 'Drag to rotate, pinch to zoom' : 'Drag to rotate, scroll to zoom'}
                    </p>
                    <p className="model-viewer__hint model-viewer__hint--keys">
                        Arrow keys rotate, + and - zoom, Home resets
                    </p>
                </>
            )}

            {status === 'error' && (
                <div className="model-viewer__overlay model-viewer__fallback">
                    <Box className="model-viewer__fallback-icon" size={compact ? 24 : 36} aria-hidden="true" />
                    <p id={messageId} className="model-viewer__message">
                        3D preview unavailable.
                        <span className="model-viewer__detail"> {error.message}</span>
                    </p>
                    {downloadUrl && (
                        <a className="model-viewer__download" href={downloadUrl} download={filename || ''}>
                            <Download size={16} aria-hidden="true" /> Download the model
                        </a>
                    )}
                </div>
            )}
        </div>
    );
});

export default ModelViewer;
