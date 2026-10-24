/*
 * The three.js side of ModelViewer. Only ModelViewer imports this module, through a dynamic import(),
 * so three.js and its loaders are fetched the first time a model is shown and never sit in the eagerly
 * loaded bundle (vite.config.js puts them in the lazy vendor-three chunk). React state stays in the
 * component: this module only builds, drives and tears down one WebGL view.
 */
import {
    Box3,
    Color,
    DirectionalLight,
    DoubleSide,
    Group,
    HemisphereLight,
    Loader,
    MathUtils,
    Mesh,
    MeshStandardMaterial,
    NeutralToneMapping,
    PerspectiveCamera,
    PMREMGenerator,
    Points,
    PointsMaterial,
    Scene,
    Sphere,
    SRGBColorSpace,
    Vector2,
    Vector3,
    WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';

// Shown to the student or teacher, so they say what happened and what to do, not how three.js failed.
export const MESSAGES = {
    webgl: 'This browser cannot show 3D models because WebGL is turned off or not supported.',
    unsupported: 'This file type cannot be shown in 3D.',
    network: 'The model file could not be downloaded. Check the connection and try again.',
    missing: 'The model file could not be found. It may have been removed.',
    http: (status) => `The model file could not be downloaded (the server answered ${status}).`,
    unreadable: (format) => `The model file could not be read. It may be damaged, or not really a .${format} file.`,
    empty: 'The model file does not contain any shapes to show.',
    gltfExternal: 'This .gltf file needs separate files (such as a .bin file or textures) that are not part of it. '
        + 'Export the model as a single .glb file and upload that instead.',
    gltfCompressed: 'This model is saved with a compression the preview cannot read. '
        + 'Export it again without Draco or Meshopt compression.',
    snapshot: 'The picture of the model could not be created.',
    closed: 'The 3D view has already been closed.',
};

export class ModelViewerError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'ModelViewerError';
    }
}

// Asked for once on our own canvas, so a missing WebGL is detected without three.js logging an error,
// and handed to the renderer, which then uses exactly this context.
const CONTEXT_ATTRIBUTES = {
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    // Snapshots render and read the frame in the same task instead, which keeps normal frames cheap.
    preserveDrawingBuffer: false,
    powerPreference: 'default',
};

// Scene colours. Three.js needs numbers, so these cannot come from the CSS variables.
const PRINT_COLOR = 0xb4bdc8;   // matte light grey, like an unpainted print
const SKY_COLOR = 0xffffff;
const GROUND_COLOR = 0x5d6670;
const SNAPSHOT_BACKGROUND = 0xffffff; // --bg-primary, for image types without transparency

// 3D printing tools (Tinkercad, slicers, Blender's STL and PLY export) write Z as "up"; three.js uses Y.
const Z_UP_FORMATS = ['stl', '3mf', 'ply'];
// A three-quarter view from the front right, a little above, like a product photo.
const INITIAL_DIRECTION = new Vector3(0.62, 0.42, 0.66).normalize();
const FIELD_OF_VIEW = 35;
// Room around the model's bounding sphere, so it never touches the edge while it turns.
const FRAME_MARGIN = 1.08;
const MAX_PIXEL_RATIO = 2;
const MAX_SNAPSHOT_SIDE = 4096;
// Used until the container has a size (it may still be hidden when the model arrives).
const FALLBACK_SIZE = { width: 300, height: 150 };
const ZOOM_STEP = 0.8;
const TYPES_WITH_ALPHA = ['image/png', 'image/webp'];
const GLB_MAGIC = 0x46546c67;      // "glTF", little-endian
const GLB_JSON_CHUNK = 0x4e4f534a; // "JSON"
// Without a decoder three.js cannot read these; Draco fails as soon as it is listed at all.
const GLTF_DECODER_EXTENSIONS = ['EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu'];
const GLTF_DRACO = 'KHR_draco_mesh_compression';

const isAborted = (signal) => Boolean(signal && signal.aborted);
const abortError = (signal) => (
    signal.reason instanceof Error ? signal.reason : new DOMException('The model load was cancelled.', 'AbortError')
);
const throwIfAborted = (signal) => {
    if (isAborted(signal)) throw abortError(signal);
};

// Reads the response itself instead of letting a three.js loader fetch the URL, so the download can be
// cancelled, reports progress, and fails with a message that says what went wrong.
async function download(src, { signal, onProgress }) {
    let response;
    try {
        response = await fetch(src, { signal });
    } catch (err) {
        throwIfAborted(signal);
        throw new ModelViewerError(MESSAGES.network, { cause: err });
    }
    if (!response.ok) {
        throw new ModelViewerError(response.status === 404 ? MESSAGES.missing : MESSAGES.http(response.status));
    }

    try {
        const total = Number(response.headers.get('Content-Length')) || 0;
        if (!total || !response.body || typeof response.body.getReader !== 'function') {
            return await response.arrayBuffer();
        }
        const reader = response.body.getReader();
        // Browsers end the body with an error when the fetch is aborted; not every fetch implementation
        // does, so the reader is also cancelled directly, which ends a read that is still waiting.
        const stopReading = () => {
            reader.cancel().catch(() => {});
        };
        if (signal) signal.addEventListener('abort', stopReading, { once: true });
        const chunks = [];
        let loaded = 0;
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                loaded += value.byteLength;
                // A compressed response can deliver more bytes than its Content-Length.
                if (onProgress && !isAborted(signal)) onProgress(Math.min(loaded / total, 1));
            }
        } finally {
            if (signal) signal.removeEventListener('abort', stopReading);
        }
        throwIfAborted(signal);
        const bytes = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return bytes.buffer;
    } catch (err) {
        throwIfAborted(signal);
        throw new ModelViewerError(MESSAGES.network, { cause: err });
    }
}

const createPrintMaterial = ({ vertexColors = false, flatShading = false } = {}) => new MeshStandardMaterial({
    // Vertex colours are multiplied by the base colour, so it must be white for them to show as saved.
    color: vertexColors ? 0xffffff : PRINT_COLOR,
    roughness: 0.62,
    metalness: 0.05,
    vertexColors,
    flatShading,
    // Hand-made meshes often have some faces wound the wrong way; drawing both sides avoids holes.
    side: DoubleSide,
});

// Swaps each mesh material for pick(material), releasing the ones it replaces.
const replaceMaterials = (root, pick) => {
    root.traverse((node) => {
        if (!node.isMesh) return;
        const list = Array.isArray(node.material) ? node.material : [node.material];
        const next = list.map((material) => {
            const replacement = pick(material);
            if (replacement !== material) material.dispose();
            return replacement;
        });
        node.material = Array.isArray(node.material) ? next : next[0];
    });
};

const meshFromGeometry = (geometry, { recomputeNormals }) => {
    // STL normals come from the file and some exporters write zeros, which would render the model black.
    if (recomputeNormals || !geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    return new Mesh(geometry, createPrintMaterial({ vertexColors: geometry.hasAttribute('color') }));
};

// The PLY header is ASCII up to "end_header", even in binary files.
const plyHasFaces = (buffer) => {
    const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192)));
    const match = /^element\s+face\s+(\d+)/m.exec(head.split('end_header')[0]);
    return Boolean(match && Number(match[1]) > 0);
};

const pointsFromGeometry = (geometry) => {
    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere && geometry.boundingSphere.radius > 0 ? geometry.boundingSphere.radius : 1;
    const vertexColors = geometry.hasAttribute('color');
    return new Points(geometry, new PointsMaterial({
        // In world units, so a scan looks the same whatever its scale.
        size: radius / 50,
        sizeAttenuation: true,
        vertexColors,
        color: vertexColors ? 0xffffff : PRINT_COLOR,
    }));
};

// The JSON part of a .gltf or .glb, read before three.js sees the file: a reference to a separate file
// can never load here (the upload is a single file), and it would make the browser fetch an arbitrary URL.
const readGltfJson = (buffer) => {
    const view = new DataView(buffer);
    if (buffer.byteLength >= 20 && view.getUint32(0, true) === GLB_MAGIC) {
        if (view.getUint32(16, true) !== GLB_JSON_CHUNK) throw new Error('GLB without a JSON chunk');
        return JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))));
    }
    return JSON.parse(new TextDecoder().decode(buffer));
};

const checkGltf = (json) => {
    const external = [...(json.buffers || []), ...(json.images || [])]
        .some((entry) => entry && typeof entry.uri === 'string' && !/^data:/i.test(entry.uri));
    if (external) throw new ModelViewerError(MESSAGES.gltfExternal);
    const used = json.extensionsUsed || [];
    const required = json.extensionsRequired || [];
    if (used.includes(GLTF_DRACO) || required.includes(GLTF_DRACO)
        || required.some((name) => GLTF_DECODER_EXTENSIONS.includes(name))) {
        throw new ModelViewerError(MESSAGES.gltfCompressed);
    }
};

const PARSERS = {
    stl: (buffer) => meshFromGeometry(new STLLoader().parse(buffer), { recomputeNormals: true }),
    ply: (buffer) => {
        const geometry = new PLYLoader().parse(buffer);
        return plyHasFaces(buffer) ? meshFromGeometry(geometry, { recomputeNormals: false }) : pointsFromGeometry(geometry);
    },
    obj: (buffer) => {
        const text = new TextDecoder().decode(buffer);
        // A binary file renamed to .obj would make the loader warn once for every "line" of it.
        if (text.slice(0, 65536).includes('\u0000')) throw new Error('binary data in an OBJ file');
        const group = new OBJLoader().parse(text);
        // Materials of an OBJ live in a separate .mtl file that is never loaded here.
        replaceMaterials(group, (material) => createPrintMaterial({
            vertexColors: material.vertexColors,
            flatShading: material.flatShading,
        }));
        return group;
    },
    '3mf': (buffer) => {
        const group = new ThreeMFLoader().parse(buffer);
        // Parts saved without a colour come back in the loader's plain white; give them the print look.
        if (group && group.isObject3D) {
            replaceMaterials(group, (material) => (
                material.name === Loader.DEFAULT_MATERIAL_NAME ? createPrintMaterial({ flatShading: true }) : material
            ));
        }
        return group;
    },
    gltf: async (buffer) => {
        const json = readGltfJson(buffer);
        checkGltf(json);
        const gltf = await new GLTFLoader().parseAsync(buffer, '');
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        // Without materials the loader falls back to a fully metallic white, which looks like chrome.
        if (root && !(json.materials && json.materials.length)) {
            replaceMaterials(root, (material) => createPrintMaterial({ vertexColors: material.vertexColors }));
        }
        return root;
    },
};
PARSERS.glb = PARSERS.gltf;

async function parseModel(format, buffer) {
    let object;
    try {
        object = await PARSERS[format](buffer);
    } catch (err) {
        if (err instanceof ModelViewerError) throw err;
        throw new ModelViewerError(MESSAGES.unreadable(format), { cause: err });
    }
    if (!object || !object.isObject3D) throw new ModelViewerError(MESSAGES.unreadable(format));
    return object;
}

const disposeTexture = (texture) => {
    // Image bitmaps hold decoded pixels outside the GPU until closed.
    const data = texture.source && texture.source.data;
    if (data && typeof data.close === 'function') data.close();
    texture.dispose();
};

const disposeObject = (root) => {
    root.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
            if (!material) continue;
            for (const value of Object.values(material)) {
                if (value && value.isTexture) disposeTexture(value);
            }
            material.dispose();
        }
        if (node.isLight && typeof node.dispose === 'function') node.dispose();
    });
};

const clampSide = (value, fallback) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? Math.min(number, MAX_SNAPSHOT_SIDE) : fallback;
};

/**
 * Builds a 3D view of the model at `src` inside `container` (an empty element sized by CSS).
 *
 * Resolves, once the model is on screen, with { dispose, snapshot, reset, setAutoRotate, resize, rotate, zoom }.
 * Rejects with a ModelViewerError whose message can be shown as is (no WebGL, download failed, unreadable
 * file), or with the abort reason when `signal` is aborted. Nothing is left behind on rejection.
 */
export async function createModelViewer(container, {
    src,
    format,
    autoRotate = true,
    interactive = true,
    onProgress,
    signal,
} = {}) {
    if (!Object.prototype.hasOwnProperty.call(PARSERS, format)) throw new ModelViewerError(MESSAGES.unsupported);
    throwIfAborted(signal);

    const canvas = document.createElement('canvas');
    canvas.className = 'model-viewer__canvas';
    const context = canvas.getContext('webgl2', CONTEXT_ATTRIBUTES);
    if (!context) throw new ModelViewerError(MESSAGES.webgl);

    // Every resource is released in reverse order of creation, by dispose() or by a failed load.
    const cleanups = [];
    let disposed = false;
    const dispose = () => {
        if (disposed) return;
        disposed = true;
        while (cleanups.length) {
            const release = cleanups.pop();
            try {
                release();
            } catch {
                // One failing release must not keep the others (and the WebGL context) alive.
            }
        }
    };

    try {
        cleanups.push(() => canvas.remove());

        let renderer;
        try {
            renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
        } catch (err) {
            throw new ModelViewerError(MESSAGES.webgl, { cause: err });
        }
        cleanups.push(() => {
            renderer.setAnimationLoop(null);
            renderer.dispose();
            // Browsers keep only a few WebGL contexts alive; give this one back now, not at garbage collection.
            renderer.forceContextLoss();
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
        renderer.setSize(FALLBACK_SIZE.width, FALLBACK_SIZE.height, false);
        renderer.outputColorSpace = SRGBColorSpace;
        // Keeps the saved colours of glTF materials while softening highlights the lights would clip.
        renderer.toneMapping = NeutralToneMapping;

        const scene = new Scene();
        cleanups.push(() => disposeObject(scene));

        // A soft studio reflection, so metallic and glossy glTF materials do not render flat or black.
        const pmrem = new PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const environment = pmrem.fromScene(room, 0.04);
        room.dispose();
        cleanups.push(() => {
            environment.dispose();
            pmrem.dispose();
        });
        scene.environment = environment.texture;
        scene.environmentIntensity = 0.35;

        const camera = new PerspectiveCamera(FIELD_OF_VIEW, FALLBACK_SIZE.width / FALLBACK_SIZE.height, 0.01, 1000);
        scene.add(camera);
        scene.add(new HemisphereLight(SKY_COLOR, GROUND_COLOR, 0.9));
        // The key light travels with the camera, so whichever side faces the viewer is the lit one.
        const keyLight = new DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(-1, 1.2, 0.4);
        keyLight.target.position.set(0, 0, -1);
        camera.add(keyLight, keyLight.target);

        const controls = new OrbitControls(camera);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotateSpeed = 2;
        cleanups.push(() => {
            // dispose() disconnects, which needs a connected element.
            if (controls.domElement) controls.dispose();
        });

        const buffer = await download(src, { signal, onProgress });
        throwIfAborted(signal);
        const object = await parseModel(format, buffer);

        // The holder turns Z-up files upright and moves the model's centre to the origin, whatever the
        // origin of the file was, so the camera can orbit the middle of the model. It joins the scene
        // straight away so that a cancelled or failed load releases the parsed model with everything else.
        const holder = new Group();
        holder.add(object);
        scene.add(holder);
        throwIfAborted(signal);
        if (Z_UP_FORMATS.includes(format)) holder.rotation.x = -Math.PI / 2;
        holder.updateMatrixWorld(true);
        const box = new Box3().setFromObject(holder);
        const sphere = box.isEmpty() ? null : box.getBoundingSphere(new Sphere());
        if (!sphere || !(sphere.radius > 0) || !Number.isFinite(sphere.radius)) {
            throw new ModelViewerError(MESSAGES.empty);
        }
        const { radius } = sphere;
        holder.position.sub(sphere.center);

        let interacted = false;
        let wantsAutoRotate = Boolean(autoRotate);
        let needsRender = true;
        let width = 0;
        let height = 0;

        // The distance at which the bounding sphere fills the narrower side of the view.
        const fitDistance = () => {
            const verticalFov = MathUtils.degToRad(camera.fov);
            const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
            return (radius * FRAME_MARGIN) / Math.sin(Math.min(verticalFov, horizontalFov) / 2);
        };

        const frame = (direction) => {
            const distance = fitDistance();
            controls.target.set(0, 0, 0);
            camera.position.copy(direction).multiplyScalar(distance);
            controls.minDistance = radius * 0.3;
            controls.maxDistance = distance * 5;
            camera.near = radius / 100;
            camera.far = controls.maxDistance + radius * 2;
            camera.updateProjectionMatrix();
            controls.update();
            needsRender = true;
        };

        const resize = () => {
            const nextWidth = Math.round(container.clientWidth);
            const nextHeight = Math.round(container.clientHeight);
            // A hidden container measures 0: keep the last size rather than collapse the canvas.
            if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return;
            width = nextWidth;
            height = nextHeight;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            // Until someone moves the camera, keep the whole model in view as the layout changes.
            if (!interacted) frame(camera.position.clone().sub(controls.target).normalize());
            needsRender = true;
        };

        const markInteracted = () => {
            interacted = true;
            controls.autoRotate = false;
        };

        const reset = () => {
            if (disposed) return;
            // Drop the momentum of the last drag first, or the view would drift away from the reset position.
            controls.enableDamping = false;
            controls.update();
            controls.enableDamping = true;
            frame(INITIAL_DIRECTION);
        };

        const setAutoRotate = (value) => {
            wantsAutoRotate = Boolean(value);
            // Once someone has turned the model, it stays where they left it.
            controls.autoRotate = wantsAutoRotate && !interacted;
            needsRender = true;
        };

        // azimuth > 0 moves the camera to the right around the model, polar > 0 moves it up (radians).
        const rotate = (azimuth = 0, polar = 0) => {
            if (disposed) return;
            markInteracted();
            controls.rotateLeft(-azimuth);
            controls.rotateUp(polar);
        };

        const zoom = (steps) => {
            if (disposed || !steps) return;
            markInteracted();
            if (steps > 0) controls.dollyIn(ZOOM_STEP);
            else controls.dollyOut(ZOOM_STEP);
        };

        const snapshot = ({ width: snapWidth = 1200, height: snapHeight = 675, type = 'image/png' } = {}) => {
            if (disposed) return Promise.reject(new ModelViewerError(MESSAGES.closed));
            const outWidth = clampSide(snapWidth, 1200);
            const outHeight = clampSide(snapHeight, 675);
            const shot = new PerspectiveCamera().copy(camera, false);
            shot.aspect = outWidth / outHeight;
            // Keep everything that is visible now: a picture narrower than the view gets a taller field
            // of view instead of cropped sides.
            if (shot.aspect < camera.aspect) {
                const halfHeight = Math.tan(MathUtils.degToRad(camera.fov) / 2) * (camera.aspect / shot.aspect);
                shot.fov = MathUtils.radToDeg(2 * Math.atan(halfHeight));
            }
            shot.updateProjectionMatrix();

            const pixelRatio = renderer.getPixelRatio();
            const size = renderer.getSize(new Vector2());
            const background = scene.background;
            if (!TYPES_WITH_ALPHA.includes(type)) scene.background = new Color(SNAPSHOT_BACKGROUND);
            return new Promise((resolve, reject) => {
                try {
                    renderer.setPixelRatio(1);
                    renderer.setSize(outWidth, outHeight, false);
                    renderer.render(scene, shot);
                    // toBlob copies the drawing buffer when it is called, so this frame is captured before
                    // the browser presents (and clears) it at the end of the task.
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new ModelViewerError(MESSAGES.snapshot));
                    }, type);
                } catch (err) {
                    reject(new ModelViewerError(MESSAGES.snapshot, { cause: err }));
                } finally {
                    scene.background = background;
                    renderer.setPixelRatio(pixelRatio);
                    renderer.setSize(size.x, size.y, false);
                    renderer.render(scene, camera);
                }
            });
        };

        // The controls also move the camera outside the frame loop (a wheel zoom, a key press), and then
        // report it only through this event, not through the next update() of the loop.
        const requestRender = () => {
            needsRender = true;
        };
        controls.addEventListener('change', requestRender);
        cleanups.push(() => controls.removeEventListener('change', requestRender));

        let lastTime = null;
        const tick = (time) => {
            const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.1);
            lastTime = time;
            // Only draw when something moved: an idle viewer costs one cheap check per frame.
            if (controls.update(delta) || needsRender) {
                needsRender = false;
                renderer.render(scene, camera);
            }
        };
        const setRunning = (running) => {
            lastTime = null;
            renderer.setAnimationLoop(running ? tick : null);
        };

        container.appendChild(canvas);
        if (interactive) {
            controls.connect(canvas);
            controls.cursorStyle = 'grab';
            controls.addEventListener('start', markInteracted);
            canvas.addEventListener('dblclick', reset);
            cleanups.push(() => {
                controls.removeEventListener('start', markInteracted);
                canvas.removeEventListener('dblclick', reset);
            });
        }

        if (typeof ResizeObserver === 'function') {
            const resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(container);
            cleanups.push(() => resizeObserver.disconnect());
        } else {
            window.addEventListener('resize', resize);
            cleanups.push(() => window.removeEventListener('resize', resize));
        }
        // A viewer scrolled out of sight stops drawing until it comes back.
        if (typeof IntersectionObserver === 'function') {
            const visibilityObserver = new IntersectionObserver((entries) => {
                const visible = entries[entries.length - 1].isIntersecting;
                if (visible) needsRender = true;
                setRunning(visible);
            });
            visibilityObserver.observe(container);
            cleanups.push(() => visibilityObserver.disconnect());
        }

        frame(INITIAL_DIRECTION);
        resize();
        setAutoRotate(wantsAutoRotate);
        setRunning(true);

        return { dispose, snapshot, reset, setAutoRotate, resize, rotate, zoom };
    } catch (err) {
        dispose();
        throw err;
    }
}
