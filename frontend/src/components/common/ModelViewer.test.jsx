import React, { createRef, StrictMode } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ModelViewer from './ModelViewer';

// happy-dom has no WebGL, so the three.js engine is replaced by a controllable fake: each test decides
// when (and how) a load finishes. The real engine has its own tests.
const engine = vi.hoisted(() => ({ createModelViewer: vi.fn() }));
vi.mock('./modelViewerEngine', () => engine);

const ROTATE_STEP = Math.PI / 12;

const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const fakeViewer = () => ({
    dispose: vi.fn(),
    snapshot: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
    reset: vi.fn(),
    setAutoRotate: vi.fn(),
    resize: vi.fn(),
    rotate: vi.fn(),
    zoom: vi.fn(),
});

const viewerError = (message) => Object.assign(new Error(message), { name: 'ModelViewerError' });

// Every createModelViewer call gets its own pending load, settled by the test.
let loads;
beforeEach(() => {
    loads = [];
    engine.createModelViewer.mockReset();
    engine.createModelViewer.mockImplementation((container, options) => {
        const load = { container, options, ...deferred() };
        loads.push(load);
        return load.promise;
    });
});

const lastLoad = () => loads[loads.length - 1];
const started = async (count = 1) => {
    await waitFor(() => expect(loads).toHaveLength(count));
    return lastLoad();
};
const finish = async (load, viewer = fakeViewer()) => {
    await act(async () => {
        load.resolve(viewer);
    });
    return viewer;
};
const fail = async (load, error) => {
    await act(async () => {
        load.reject(error);
    });
};

const viewerRoot = () => document.querySelector('.model-viewer');

// A matchMedia whose answers the test controls, with a way to flip one later.
const installMatchMedia = (initial = {}) => {
    const lists = new Map();
    const original = window.matchMedia;
    window.matchMedia = vi.fn((query) => {
        if (!lists.has(query)) {
            const listeners = new Set();
            lists.set(query, {
                media: query,
                matches: Boolean(initial[query]),
                addEventListener: vi.fn((type, listener) => listeners.add(listener)),
                removeEventListener: vi.fn((type, listener) => listeners.delete(listener)),
                set(value) {
                    this.matches = value;
                    listeners.forEach((listener) => listener({ matches: value, media: query }));
                },
                listeners,
            });
        }
        return lists.get(query);
    });
    return {
        list: (query) => window.matchMedia(query),
        restore: () => {
            window.matchMedia = original;
        },
    };
};

const REDUCE = '(prefers-reduced-motion: reduce)';
const COARSE = '(pointer: coarse)';

describe('ModelViewer', () => {
    describe('loading', () => {
        it('starts the engine in its stage with the model, its format and the defaults', async () => {
            render(<ModelViewer src="/user/project_files/12/robot.stl" filename="robot.stl" />);

            const load = await started();
            expect(load.container).toBe(document.querySelector('.model-viewer__stage'));
            expect(load.options).toMatchObject({
                src: '/user/project_files/12/robot.stl',
                format: 'stl',
                autoRotate: true,
                interactive: true,
            });
            expect(load.options.signal).toBeInstanceOf(AbortSignal);
            expect(load.options.signal.aborted).toBe(false);
            expect(load.options.onProgress).toEqual(expect.any(Function));
        });

        it('shows a busy loading state until the model is ready', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);

            expect(screen.getByText('Loading 3D model…')).toBeInTheDocument();
            expect(viewerRoot()).toHaveAttribute('aria-busy', 'true');
            expect(viewerRoot()).toHaveClass('model-viewer--loading');
            expect(viewerRoot()).not.toHaveAttribute('tabindex');
            expect(screen.queryByText(/Drag to rotate/)).not.toBeInTheDocument();
            await started();
        });

        it('shows the download progress as a percentage once the engine reports it', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            const load = await started();

            act(() => load.options.onProgress(0.416));
            expect(screen.getByText('Loading 3D model… 42%')).toBeInTheDocument();

            act(() => load.options.onProgress(0.42));
            expect(screen.getByText('Loading 3D model… 42%')).toBeInTheDocument();

            act(() => load.options.onProgress(1));
            expect(screen.getByText('Loading 3D model… 100%')).toBeInTheDocument();
        });

        it('ignores progress that arrives after the model is ready', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            const load = await started();
            await finish(load);

            act(() => load.options.onProgress(0.5));

            expect(screen.queryByText(/Loading 3D model/)).not.toBeInTheDocument();
            expect(viewerRoot()).toHaveClass('model-viewer--ready');
        });
    });

    describe('ready', () => {
        it('shows the usage hint, takes keyboard focus and reports onLoad', async () => {
            const onLoad = vi.fn();
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" onLoad={onLoad} />);
            await finish(await started());

            expect(screen.getByText('Drag to rotate, scroll to zoom')).toBeInTheDocument();
            expect(screen.getByText('Arrow keys rotate, + and - zoom, Home resets')).toBeInTheDocument();
            expect(screen.queryByText(/Loading 3D model/)).not.toBeInTheDocument();
            expect(viewerRoot()).toHaveClass('model-viewer--ready');
            expect(viewerRoot()).not.toHaveAttribute('aria-busy');
            expect(viewerRoot()).toHaveAttribute('tabindex', '0');
            expect(onLoad).toHaveBeenCalledTimes(1);
            expect(onLoad).toHaveBeenCalledWith({ format: 'stl' });
        });

        it('names the gesture for touch screens', async () => {
            const media = installMatchMedia({ [COARSE]: true });
            try {
                render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
                await finish(await started());

                expect(screen.getByText('Drag to rotate, pinch to zoom')).toBeInTheDocument();
            } finally {
                media.restore();
            }
        });

        it('shows the model without hint, focus or keys when it is not interactive', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" interactive={false} />);
            const load = await started();
            expect(load.options.interactive).toBe(false);
            const viewer = await finish(load);

            expect(viewerRoot()).toHaveClass('model-viewer--ready');
            expect(screen.queryByText(/Drag to rotate/)).not.toBeInTheDocument();
            expect(viewerRoot()).not.toHaveAttribute('tabindex');
            fireEvent.keyDown(viewerRoot(), { key: 'ArrowRight' });
            expect(viewer.rotate).not.toHaveBeenCalled();
        });

        it('calls the newest onLoad without starting the load again when the callback changes', async () => {
            const first = vi.fn();
            const second = vi.fn();
            const { rerender } = render(<ModelViewer src="/m/robot.stl" filename="robot.stl" onLoad={first} />);
            const load = await started();

            rerender(<ModelViewer src="/m/robot.stl" filename="robot.stl" onLoad={second} />);
            await finish(load);

            expect(engine.createModelViewer).toHaveBeenCalledTimes(1);
            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledTimes(1);
        });
    });

    describe('errors', () => {
        it('shows the fallback with the reason and a download link, and reports onError', async () => {
            const onError = vi.fn();
            const error = viewerError('This browser cannot show 3D models because WebGL is turned off or not supported.');
            render(
                <ModelViewer
                    src="/user/project_files/12/robot.stl"
                    filename="robot.stl"
                    downloadUrl="/user/project_files/12/robot.stl?download=1"
                    onError={onError}
                />
            );
            await fail(await started(), error);

            expect(screen.getByText('3D preview unavailable.')).toBeInTheDocument();
            expect(screen.getByText(/WebGL is turned off or not supported/)).toBeInTheDocument();
            const link = screen.getByRole('link', { name: /Download the model/ });
            expect(link).toHaveAttribute('href', '/user/project_files/12/robot.stl?download=1');
            expect(link).toHaveAttribute('download', 'robot.stl');
            expect(viewerRoot()).toHaveClass('model-viewer--error');
            expect(viewerRoot()).not.toHaveAttribute('aria-busy');
            expect(viewerRoot()).not.toHaveAttribute('tabindex');
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(error);
        });

        it('describes the image with the fallback message', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            await fail(await started(), viewerError('The model file could not be found. It may have been removed.'));

            const message = screen.getByText('3D preview unavailable.', { exact: false });
            expect(viewerRoot()).toHaveAttribute('aria-describedby', message.id);
            expect(message).toHaveTextContent('3D preview unavailable. The model file could not be found.');
        });

        it('offers no link without a downloadUrl', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            await fail(await started(), viewerError('The model file does not contain any shapes to show.'));

            expect(screen.getByText('3D preview unavailable.')).toBeInTheDocument();
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });

        it('lets the browser name the download when there is no file name', async () => {
            render(<ModelViewer src="blob:http://localhost/abc" format="stl" downloadUrl="blob:http://localhost/abc" />);
            await fail(await started(), viewerError('The model file could not be downloaded.'));

            expect(screen.getByRole('link', { name: /Download the model/ })).toHaveAttribute('download', '');
        });

        it('explains an unexpected failure in plain words and keeps the original as the cause', async () => {
            const onError = vi.fn();
            const bug = new TypeError("Cannot read properties of undefined (reading 'x')");
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" onError={onError} />);
            await fail(await started(), bug);

            expect(screen.getByText(/The 3D viewer could not be started. Reload the page to try again./)).toBeInTheDocument();
            expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument();
            const reported = onError.mock.calls[0][0];
            expect(reported).toBeInstanceOf(Error);
            expect(reported.name).toBe('ModelViewerError');
            expect(reported.message).toBe('The 3D viewer could not be started. Reload the page to try again.');
            expect(reported.cause).toBe(bug);
        });

        it('treats a rejection without an error object as an unexpected failure', async () => {
            const onError = vi.fn();
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" onError={onError} />);
            await fail(await started(), undefined);

            expect(screen.getByText(/The 3D viewer could not be started/)).toBeInTheDocument();
            expect(onError).toHaveBeenCalledTimes(1);
        });

        it('shows the fallback without loading anything when there is no src', async () => {
            const onError = vi.fn();
            render(<ModelViewer filename="robot.stl" downloadUrl="/d/robot.stl" onError={onError} />);

            expect(screen.getByText('3D preview unavailable.')).toBeInTheDocument();
            expect(screen.getByText(/No model file was given./)).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /Download the model/ })).toHaveAttribute('href', '/d/robot.stl');
            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            expect(onError.mock.calls[0][0].message).toBe('No model file was given.');
            expect(engine.createModelViewer).not.toHaveBeenCalled();
        });
    });

    describe('format', () => {
        it('takes the format from the file name, whatever its case', async () => {
            render(<ModelViewer src="blob:http://localhost:5173/0b5e" filename="Robot.GLB" />);

            expect((await started()).options.format).toBe('glb');
        });

        it('falls back to the extension in src when the file name has none', async () => {
            render(<ModelViewer src="/user/project_files/3/arm.3mf?download=1" filename="arm" />);

            expect((await started()).options.format).toBe('3mf');
        });

        it('falls back to src when there is no file name at all', async () => {
            render(<ModelViewer src="https://api.example.com/user/project_files/4/scan.ply" />);

            expect((await started()).options.format).toBe('ply');
        });

        it('prefers an explicit format over the file name and the URL', async () => {
            render(<ModelViewer src="/m/model.stl" filename="model.stl" format=".OBJ" />);

            expect((await started()).options.format).toBe('obj');
        });

        it('ignores an empty format prop', async () => {
            render(<ModelViewer src="/m/model.stl" format="  " />);

            expect((await started()).options.format).toBe('stl');
        });

        it('shows the fallback for an explicit format the viewer cannot show', async () => {
            const onError = vi.fn();
            render(<ModelViewer src="/m/model.stl" filename="model.stl" format="fbx" onError={onError} />);

            expect(screen.getByText(/This file type cannot be shown in 3D./)).toBeInTheDocument();
            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            expect(engine.createModelViewer).not.toHaveBeenCalled();
        });

        it('shows the fallback when neither the file name nor src has a model extension', async () => {
            const onError = vi.fn();
            render(<ModelViewer src="blob:http://localhost:5173/0b5e" filename="robot.blend" downloadUrl="/d/robot.blend" onError={onError} />);

            expect(screen.getByText('3D preview unavailable.')).toBeInTheDocument();
            expect(screen.getByText(/This file type cannot be shown in 3D./)).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /Download the model/ })).toBeInTheDocument();
            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            expect(onError.mock.calls[0][0].name).toBe('ModelViewerError');
            expect(engine.createModelViewer).not.toHaveBeenCalled();
        });
    });

    describe('ref handle', () => {
        it('rejects a snapshot until a model is loaded', async () => {
            const ref = createRef();
            render(<ModelViewer ref={ref} src="/m/robot.stl" filename="robot.stl" />);
            await started();

            await expect(ref.current.snapshot()).rejects.toThrow('The model has not finished loading yet.');
        });

        it('takes a snapshot with the contract defaults', async () => {
            const ref = createRef();
            render(<ModelViewer ref={ref} src="/m/robot.stl" filename="robot.stl" />);
            const viewer = await finish(await started());

            const blob = await ref.current.snapshot();

            expect(blob).toBeInstanceOf(Blob);
            expect(viewer.snapshot).toHaveBeenCalledWith({ width: 1200, height: 675, type: 'image/png' });
        });

        it('passes the requested size and type on to the engine', async () => {
            const ref = createRef();
            render(<ModelViewer ref={ref} src="/m/robot.stl" filename="robot.stl" />);
            const viewer = await finish(await started());

            await ref.current.snapshot({ width: 640, type: 'image/jpeg' });

            expect(viewer.snapshot).toHaveBeenCalledWith({ width: 640, height: 675, type: 'image/jpeg' });
        });

        it('passes on a snapshot failure', async () => {
            const ref = createRef();
            render(<ModelViewer ref={ref} src="/m/robot.stl" filename="robot.stl" />);
            const viewer = fakeViewer();
            viewer.snapshot.mockRejectedValue(viewerError('The picture of the model could not be created.'));
            await finish(await started(), viewer);

            await expect(ref.current.snapshot()).rejects.toThrow('The picture of the model could not be created.');
        });

        it('resets the view of a loaded model, and does nothing before', async () => {
            const ref = createRef();
            render(<ModelViewer ref={ref} src="/m/robot.stl" filename="robot.stl" />);
            const load = await started();

            expect(() => ref.current.reset()).not.toThrow();
            const viewer = await finish(load);
            ref.current.reset();

            expect(viewer.reset).toHaveBeenCalledTimes(1);
        });

        it('rejects a snapshot again after the model was unmounted', async () => {
            const ref = createRef();
            const { unmount } = render(<ModelViewer ref={ref} src="/m/robot.stl" filename="robot.stl" />);
            await finish(await started());
            const handle = ref.current;

            unmount();

            await expect(handle.snapshot()).rejects.toThrow('The model has not finished loading yet.');
        });
    });

    describe('cleanup', () => {
        it('disposes the viewer on unmount', async () => {
            const { unmount } = render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            const load = await started();
            const viewer = await finish(load);

            unmount();

            expect(viewer.dispose).toHaveBeenCalledTimes(1);
            expect(load.options.signal.aborted).toBe(true);
        });

        it('cancels a load that is still running on unmount, and disposes it if it finishes anyway', async () => {
            const onLoad = vi.fn();
            const { unmount } = render(<ModelViewer src="/m/robot.stl" filename="robot.stl" onLoad={onLoad} />);
            const load = await started();

            unmount();
            expect(load.options.signal.aborted).toBe(true);
            const late = fakeViewer();
            await act(async () => {
                load.resolve(late);
            });

            expect(late.dispose).toHaveBeenCalledTimes(1);
            expect(onLoad).not.toHaveBeenCalled();
        });

        it('stays quiet when a cancelled load rejects', async () => {
            const onError = vi.fn();
            const { unmount } = render(<ModelViewer src="/m/robot.stl" filename="robot.stl" onError={onError} />);
            const load = await started();

            unmount();
            await act(async () => {
                load.reject(new DOMException('The model load was cancelled.', 'AbortError'));
            });

            expect(onError).not.toHaveBeenCalled();
        });

        it('disposes the old viewer and loads the new model when src changes', async () => {
            const { rerender } = render(<ModelViewer src="/m/one.stl" filename="one.stl" />);
            const first = await finish(await started());

            rerender(<ModelViewer src="/m/two.glb" filename="two.glb" />);

            expect(first.dispose).toHaveBeenCalledTimes(1);
            const second = await started(2);
            expect(second.options).toMatchObject({ src: '/m/two.glb', format: 'glb' });
            expect(screen.getByText('Loading 3D model…')).toBeInTheDocument();
            expect(viewerRoot()).toHaveAttribute('aria-busy', 'true');

            const viewer = await finish(second);
            expect(viewerRoot()).toHaveClass('model-viewer--ready');
            expect(viewer.dispose).not.toHaveBeenCalled();
        });

        it('cancels the first load when src changes before it finishes, and ignores its result', async () => {
            const onError = vi.fn();
            const { rerender } = render(<ModelViewer src="/m/one.stl" filename="one.stl" onError={onError} />);
            const first = await started();

            rerender(<ModelViewer src="/m/two.stl" filename="two.stl" onError={onError} />);
            expect(first.options.signal.aborted).toBe(true);
            const second = await started(2);

            await fail(first, viewerError('The model file could not be read.'));
            expect(screen.queryByText('3D preview unavailable.')).not.toBeInTheDocument();
            expect(onError).not.toHaveBeenCalled();

            await finish(second);
            expect(viewerRoot()).toHaveClass('model-viewer--ready');
        });

        it('shows the loading state again when returning to an earlier model', async () => {
            const { rerender } = render(<ModelViewer src="/m/one.stl" filename="one.stl" />);
            await finish(await started());

            rerender(<ModelViewer src="/m/two.stl" filename="two.stl" />);
            await started(2);
            rerender(<ModelViewer src="/m/one.stl" filename="one.stl" />);
            await started(3);

            expect(viewerRoot()).toHaveClass('model-viewer--loading');
            expect(screen.getByText('Loading 3D model…')).toBeInTheDocument();
        });

        it('reloads when interactivity changes', async () => {
            const { rerender } = render(<ModelViewer src="/m/one.stl" filename="one.stl" />);
            const first = await finish(await started());

            rerender(<ModelViewer src="/m/one.stl" filename="one.stl" interactive={false} />);

            expect(first.dispose).toHaveBeenCalledTimes(1);
            expect((await started(2)).options.interactive).toBe(false);
        });

        it('leaves exactly one live viewer in StrictMode', async () => {
            render(
                <StrictMode>
                    <ModelViewer src="/m/robot.stl" filename="robot.stl" />
                </StrictMode>
            );
            // The first, cancelled run still reaches the engine (which gives up on an aborted signal).
            await started(2);
            const viewers = [];
            for (const load of loads) viewers.push(await finish(load));

            const live = viewers.filter((viewer) => !viewer.dispose.mock.calls.length);
            expect(live).toHaveLength(1);
            expect(loads.filter((load) => !load.options.signal.aborted)).toHaveLength(1);
        });
    });

    describe('auto-rotation', () => {
        let media;
        afterEach(() => media?.restore());

        it('keeps the model still for people who prefer reduced motion', async () => {
            media = installMatchMedia({ [REDUCE]: true });
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            const load = await started();
            expect(load.options.autoRotate).toBe(false);

            const viewer = await finish(load);
            expect(viewer.setAutoRotate).toHaveBeenLastCalledWith(false);
        });

        it('follows a change of the reduced-motion setting while the viewer is open', async () => {
            media = installMatchMedia({ [REDUCE]: false });
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            const load = await started();
            expect(load.options.autoRotate).toBe(true);
            const viewer = await finish(load);
            expect(viewer.setAutoRotate).toHaveBeenLastCalledWith(true);

            act(() => media.list(REDUCE).set(true));
            expect(viewer.setAutoRotate).toHaveBeenLastCalledWith(false);

            act(() => media.list(REDUCE).set(false));
            expect(viewer.setAutoRotate).toHaveBeenLastCalledWith(true);
            expect(engine.createModelViewer).toHaveBeenCalledTimes(1);
        });

        it('stops listening to the setting on unmount', async () => {
            media = installMatchMedia();
            const { unmount } = render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            await started();
            expect(media.list(REDUCE).listeners.size).toBeGreaterThan(0);

            unmount();

            expect(media.list(REDUCE).listeners.size).toBe(0);
        });

        it('does not rotate when autoRotate is off, and follows the prop later', async () => {
            const { rerender } = render(<ModelViewer src="/m/robot.stl" filename="robot.stl" autoRotate={false} />);
            const load = await started();
            expect(load.options.autoRotate).toBe(false);
            const viewer = await finish(load);

            rerender(<ModelViewer src="/m/robot.stl" filename="robot.stl" autoRotate />);

            expect(viewer.setAutoRotate).toHaveBeenLastCalledWith(true);
            expect(engine.createModelViewer).toHaveBeenCalledTimes(1);
        });

        it('works in a browser without matchMedia', async () => {
            const original = window.matchMedia;
            window.matchMedia = undefined;
            try {
                render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
                const load = await started();
                expect(load.options.autoRotate).toBe(true);
                await finish(load);
                expect(screen.getByText('Drag to rotate, scroll to zoom')).toBeInTheDocument();
            } finally {
                window.matchMedia = original;
            }
        });
    });

    describe('keyboard', () => {
        const ready = async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            return finish(await started());
        };

        it.each([
            ['ArrowLeft', 'rotate', [-ROTATE_STEP, 0]],
            ['ArrowRight', 'rotate', [ROTATE_STEP, 0]],
            ['ArrowUp', 'rotate', [0, ROTATE_STEP]],
            ['ArrowDown', 'rotate', [0, -ROTATE_STEP]],
            ['+', 'zoom', [1]],
            ['=', 'zoom', [1]],
            ['-', 'zoom', [-1]],
            ['_', 'zoom', [-1]],
            ['Home', 'reset', []],
            ['0', 'reset', []],
        ])('%s calls %s', async (key, method, args) => {
            const viewer = await ready();

            const notPrevented = fireEvent.keyDown(viewerRoot(), { key });

            expect(viewer[method]).toHaveBeenCalledWith(...args);
            // Handled keys must not also scroll the page.
            expect(notPrevented).toBe(false);
        });

        it('leaves other keys and browser shortcuts alone', async () => {
            const viewer = await ready();

            expect(fireEvent.keyDown(viewerRoot(), { key: 'a' })).toBe(true);
            expect(fireEvent.keyDown(viewerRoot(), { key: 'Tab' })).toBe(true);
            expect(fireEvent.keyDown(viewerRoot(), { key: '+', ctrlKey: true })).toBe(true);
            expect(fireEvent.keyDown(viewerRoot(), { key: 'ArrowLeft', metaKey: true })).toBe(true);
            expect(fireEvent.keyDown(viewerRoot(), { key: 'ArrowLeft', altKey: true })).toBe(true);

            expect(viewer.rotate).not.toHaveBeenCalled();
            expect(viewer.zoom).not.toHaveBeenCalled();
        });

        it('ignores keys while the model is loading', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            await started();

            expect(fireEvent.keyDown(viewerRoot(), { key: 'ArrowLeft' })).toBe(true);
        });

        it('can be focused once the model is ready', async () => {
            await ready();

            viewerRoot().focus();

            expect(viewerRoot()).toHaveFocus();
        });
    });

    describe('markup', () => {
        it('is an image named after the file', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);

            expect(screen.getByRole('img', { name: '3D model: robot.stl' })).toBe(viewerRoot());
            await started();
        });

        it('has a generic name without a file name', async () => {
            render(<ModelViewer src="/m/robot.stl" />);

            expect(screen.getByRole('img', { name: '3D model' })).toBeInTheDocument();
            await started();
        });

        it('uses ariaLabel when given', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" ariaLabel="Robot arm, printed in two parts" />);

            expect(screen.getByRole('img', { name: 'Robot arm, printed in two parts' })).toBeInTheDocument();
            await started();
        });

        it('keeps the image role and name in the fallback state', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);
            await fail(await started(), viewerError('This browser cannot show 3D models because WebGL is turned off or not supported.'));

            expect(screen.getByRole('img', { name: '3D model: robot.stl' })).toHaveClass('model-viewer--error');
        });

        it('adds the compact variant, the caller class and the caller style', async () => {
            render(
                <ModelViewer
                    src="/m/robot.stl"
                    filename="robot.stl"
                    compact
                    className="card-model"
                    style={{ height: '160px' }}
                />
            );

            expect(viewerRoot()).toHaveClass('model-viewer', 'model-viewer--compact', 'card-model');
            expect(viewerRoot()).toHaveStyle({ height: '160px' });
            await started();
        });

        it('is not compact by default', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" />);

            expect(viewerRoot()).not.toHaveClass('model-viewer--compact');
            await started();
        });

        it('uses smaller icons in the compact fallback', async () => {
            render(<ModelViewer src="/m/robot.stl" filename="robot.stl" compact />);
            await fail(await started(), viewerError('The model file could not be read.'));

            expect(document.querySelector('.model-viewer__fallback-icon')).toHaveAttribute('width', '24');
        });
    });

    describe('viewer code', () => {
        afterEach(() => {
            vi.doMock('./modelViewerEngine', () => engine);
            vi.resetModules();
        });

        it('shows the fallback when the 3D code cannot be downloaded, and lets the next viewer try again', async () => {
            // A fresh copy of the component, so its shared import starts from nothing.
            vi.resetModules();
            let attempts = 0;
            vi.doMock('./modelViewerEngine', () => {
                attempts += 1;
                if (attempts === 1) throw new Error('Failed to fetch dynamically imported module');
                return engine;
            });
            const { default: FreshViewer } = await import('./ModelViewer');
            const onError = vi.fn();

            const first = render(<FreshViewer src="/m/robot.stl" filename="robot.stl" downloadUrl="/d/robot.stl" onError={onError} />);

            expect(await screen.findByText(/The 3D viewer could not be started. Reload the page to try again./)).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /Download the model/ })).toBeInTheDocument();
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0].cause).toBeInstanceOf(Error);
            expect(engine.createModelViewer).not.toHaveBeenCalled();
            first.unmount();

            render(<FreshViewer src="/m/robot.stl" filename="robot.stl" />);
            await finish(await started());

            expect(viewerRoot()).toHaveClass('model-viewer--ready');
        });
    });
});
