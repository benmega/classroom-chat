import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
    Box3,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    DoubleSide,
    Group,
    Loader,
    Mesh,
    MeshPhongMaterial,
    MeshStandardMaterial,
    Points,
    PointsMaterial,
    Sphere,
    Texture,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { server } from '../../test/mocks/server';
import { createModelViewer, MESSAGES } from './modelViewerEngine';

// The engine with real three.js scene objects, loaders and controls, but without the two pieces that
// need a GPU: the WebGL renderer and the environment map generator are stand-ins that record what they
// were asked to do. The loaders' parse methods are spied on, so each test decides what a file contains.

const gl = vi.hoisted(() => ({ renderers: [], pmrems: [] }));

vi.mock('three', async (importOriginal) => {
    const actual = await importOriginal();

    class FakeWebGLRenderer {
        constructor(parameters) {
            this.parameters = parameters;
            this.domElement = parameters.canvas;
            this.pixelRatio = 1;
            this.width = 0;
            this.height = 0;
            this.loop = null;
            this.renders = [];
            this.dispose = vi.fn();
            this.forceContextLoss = vi.fn();
            this.setAnimationLoop = vi.fn((callback) => {
                this.loop = callback;
            });
            this.render = vi.fn((scene, camera) => {
                this.renders.push({
                    scene,
                    camera,
                    width: this.width,
                    height: this.height,
                    pixelRatio: this.pixelRatio,
                    background: scene.background,
                });
            });
            gl.renderers.push(this);
        }

        setPixelRatio(value) {
            this.pixelRatio = value;
        }

        getPixelRatio() {
            return this.pixelRatio;
        }

        setSize(width, height) {
            this.width = width;
            this.height = height;
        }

        getSize(target) {
            return target.set(this.width, this.height);
        }
    }

    class FakePMREMGenerator {
        constructor(renderer) {
            this.renderer = renderer;
            this.dispose = vi.fn();
            this.target = null;
            gl.pmrems.push(this);
        }

        fromScene() {
            this.target = { texture: new actual.Texture(), dispose: vi.fn() };
            return this.target;
        }
    }

    return { ...actual, WebGLRenderer: FakeWebGLRenderer, PMREMGenerator: FakePMREMGenerator };
});

const FORMATS = ['stl', 'obj', 'glb', 'gltf', '3mf', 'ply'];
const Z_UP = ['stl', '3mf', 'ply'];

// --- what the "server" returns -------------------------------------------------------------------

const encode = (text) => new TextEncoder().encode(text);

const glb = (json, { chunkType = 0x4e4f534a } = {}) => {
    const text = encode(JSON.stringify(json));
    const padded = Math.ceil(text.length / 4) * 4;
    const buffer = new ArrayBuffer(20 + padded);
    const view = new DataView(buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, buffer.byteLength, true);
    view.setUint32(12, padded, true);
    view.setUint32(16, chunkType, true);
    new Uint8Array(buffer, 20, padded).fill(0x20).set(text);
    return buffer;
};

const plyHeader = (faces) => [
    'ply',
    'format ascii 1.0',
    'element vertex 8',
    'property float x',
    'property float y',
    'property float z',
    ...(faces === null ? [] : [`element face ${faces}`, 'property list uchar int vertex_indices']),
    'end_header',
    '',
].join('\n');

const BODIES = {
    stl: () => encode('solid cube\nendsolid cube\n'),
    obj: () => encode('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'),
    glb: () => glb({ asset: { version: '2.0' } }),
    gltf: () => encode(JSON.stringify({ asset: { version: '2.0' } })),
    '3mf': () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    ply: () => encode(plyHeader(12)),
};

const serve = (name, body, init = {}) => {
    server.use(http.get(`*/models/${name}`, () => new HttpResponse(body, init)));
    return `/models/${name}`;
};

// --- what the loaders "find" in a file ----------------------------------------------------------

const box = (size = 10) => new BoxGeometry(size, size, size);
const meshGroup = (material) => {
    const group = new Group();
    group.add(new Mesh(box(), material));
    return group;
};

let spies;
const spyLoaders = () => {
    spies = {
        stl: vi.spyOn(STLLoader.prototype, 'parse').mockImplementation(() => box().toNonIndexed()),
        obj: vi.spyOn(OBJLoader.prototype, 'parse').mockImplementation(() => meshGroup(new MeshPhongMaterial())),
        gltf: vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async () => ({
            scene: meshGroup(new MeshStandardMaterial({ color: 0x3366ff })),
        })),
        '3mf': vi.spyOn(ThreeMFLoader.prototype, 'parse').mockImplementation(() => meshGroup(
            new MeshPhongMaterial({ name: Loader.DEFAULT_MATERIAL_NAME }),
        )),
        ply: vi.spyOn(PLYLoader.prototype, 'parse').mockImplementation(() => box()),
    };
    spies.glb = spies.gltf;
};

// --- the page around the viewer -----------------------------------------------------------------

const observers = { resize: [], intersection: [] };
class FakeResizeObserver {
    constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.resize.push(this);
    }
}
class FakeIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        observers.intersection.push(this);
    }
}

const makeContainer = (width = 400, height = 300) => {
    const container = document.body.appendChild(document.createElement('div'));
    const size = { width, height };
    Object.defineProperty(container, 'clientWidth', { configurable: true, get: () => size.width });
    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => size.height });
    container.resizeTo = (nextWidth, nextHeight) => {
        size.width = nextWidth;
        size.height = nextHeight;
    };
    return container;
};

const renderer = () => gl.renderers[gl.renderers.length - 1];
// Runs one animation frame and returns what it drew (or null when nothing changed).
const frame = (time = 16) => {
    const before = renderer().renders.length;
    renderer().loop(time);
    return renderer().renders.length > before ? renderer().renders[renderer().renders.length - 1] : null;
};
const lastRender = () => renderer().renders[renderer().renders.length - 1];
const holderOf = (scene) => scene.children.find((child) => child.isGroup);
const meshesOf = (root) => {
    const found = [];
    root.traverse((node) => {
        if (node.isMesh || node.isPoints) found.push(node);
    });
    return found;
};
// Settles damping: OrbitControls eases each move over many frames.
const settle = (frames = 400) => {
    for (let i = 1; i <= frames; i += 1) renderer().loop(i * 16);
};
const controlsOf = () => OrbitControls.prototype.update.mock.contexts.at(-1);
const azimuth = (camera) => Math.atan2(camera.position.x, camera.position.z);

let container;

beforeEach(() => {
    gl.renderers.length = 0;
    gl.pmrems.length = 0;
    observers.resize.length = 0;
    observers.intersection.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ isFakeWebGL2: true });
    vi.spyOn(OrbitControls.prototype, 'update');
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    spyLoaders();
    container = makeContainer();
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
});

const load = (format, options = {}) => createModelViewer(container, {
    src: serve(`model.${format}`, BODIES[format]()),
    format,
    ...options,
});

describe('choosing a loader', () => {
    it.each(FORMATS)('reads a .%s file with its own loader and no other', async (format) => {
        await load(format);

        const parse = spies[format];
        expect(parse).toHaveBeenCalledTimes(1);
        for (const other of FORMATS) {
            if (spies[other] !== parse) expect(spies[other]).not.toHaveBeenCalled();
        }
    });

    it('hands the downloaded bytes to the loader', async () => {
        await load('stl');

        const data = spies.stl.mock.calls[0][0];
        expect(data).toBeInstanceOf(ArrayBuffer);
        expect(new TextDecoder().decode(data)).toBe('solid cube\nendsolid cube\n');
    });

    it('gives the OBJ loader text', async () => {
        await load('obj');

        expect(spies.obj).toHaveBeenCalledWith('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n');
    });

    it('gives the glTF loader the whole file and no base path to fetch from', async () => {
        await load('glb');

        const [data, path] = spies.glb.mock.calls[0];
        expect(new DataView(data).getUint32(0, true)).toBe(0x46546c67);
        expect(path).toBe('');
    });
});

describe('placing the model', () => {
    it.each(FORMATS)('turns a .%s file upright only when its format is Z-up', async (format) => {
        await load(format);

        const { scene } = frame();
        expect(holderOf(scene).rotation.x).toBeCloseTo(Z_UP.includes(format) ? -Math.PI / 2 : 0);
    });

    it.each([0.001, 1, 250, 40000])('centres and frames a model of size %s far from the origin', async (size) => {
        spies.stl.mockImplementation(() => new BoxGeometry(size, size * 2, size / 2)
            .translate(1000 * size, -300 * size, 42 * size)
            .toNonIndexed());
        await load('stl');

        const { scene, camera } = frame();
        const bounds = new Box3().setFromObject(holderOf(scene));
        const sphere = bounds.getBoundingSphere(new Sphere());
        expect(sphere.center.length()).toBeLessThan(size * 1e-6);

        const distance = camera.position.length();
        const halfFov = (camera.fov * Math.PI) / 360;
        const halfHorizontalFov = Math.atan(Math.tan(halfFov) * camera.aspect);
        // The whole model fits the narrower side of the view, and fills a good part of it.
        expect(Math.asin(sphere.radius / distance)).toBeLessThanOrEqual(Math.min(halfFov, halfHorizontalFov) + 1e-9);
        expect(distance).toBeLessThan(sphere.radius * 5);
        // Nothing of it is cut off by the near or far plane.
        expect(camera.near).toBeLessThan(distance - sphere.radius);
        expect(camera.far).toBeGreaterThan(distance + sphere.radius);
    });

    it('looks at the model from the front right and a little above', async () => {
        await load('glb');

        const { camera } = frame();
        expect(camera.position.x).toBeGreaterThan(0);
        expect(camera.position.y).toBeGreaterThan(0);
        expect(camera.position.z).toBeGreaterThan(0);
    });

    it('sizes the view to its container', async () => {
        await load('stl');

        expect(renderer().width).toBe(400);
        expect(renderer().height).toBe(300);
        expect(frame().camera.aspect).toBeCloseTo(4 / 3);
        expect(container.querySelector('canvas')).toBe(renderer().domElement);
        expect(renderer().domElement).toHaveClass('model-viewer__canvas');
    });

    it('keeps a fallback size while the container is hidden', async () => {
        container.resizeTo(0, 0);
        await load('stl');

        expect(renderer().width).toBe(300);
        expect(renderer().height).toBe(150);
    });

    it('caps the pixel ratio at 2', async () => {
        vi.stubGlobal('devicePixelRatio', 3);
        await load('stl');

        expect(renderer().pixelRatio).toBe(2);
    });

    it('asks for a transparent, antialiased context and lights the scene', async () => {
        await load('stl');

        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('webgl2', expect.objectContaining({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: false,
        }));
        expect(renderer().parameters.context).toEqual({ isFakeWebGL2: true });
        const { scene } = frame();
        expect(scene.environment).toBe(gl.pmrems[0].target.texture);
        expect(scene.background).toBeNull();
        const lights = [];
        scene.traverse((node) => {
            if (node.isLight) lights.push(node.type);
        });
        expect(lights.sort()).toEqual(['DirectionalLight', 'HemisphereLight']);
    });
});

describe('materials', () => {
    const material = async (format) => {
        await load(format);
        return meshesOf(holderOf(frame().scene))[0].material;
    };

    it('shows a geometry-only STL in a matte, two-sided print material', async () => {
        const printed = await material('stl');

        expect(printed).toBeInstanceOf(MeshStandardMaterial);
        expect(printed.vertexColors).toBe(false);
        expect(printed.side).toBe(DoubleSide);
        expect(printed.metalness).toBeLessThan(0.2);
        expect(printed.roughness).toBeGreaterThan(0.4);
    });

    it('keeps the colours saved in an STL or PLY file', async () => {
        const coloured = () => {
            const geometry = box().toNonIndexed();
            geometry.setAttribute('color', new BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(0.5), 3));
            return geometry;
        };
        spies.stl.mockImplementation(coloured);
        spies.ply.mockImplementation(coloured);

        for (const format of ['stl', 'ply']) {
            const printed = await material(format);
            expect(printed.vertexColors).toBe(true);
            expect(printed.color.getHex()).toBe(0xffffff);
        }
    });

    it('recomputes STL normals, which some exporters write as zeros', async () => {
        spies.stl.mockImplementation(() => {
            const geometry = box().toNonIndexed();
            geometry.getAttribute('normal').array.fill(0);
            return geometry;
        });
        await load('stl');

        const normals = meshesOf(holderOf(frame().scene))[0].geometry.getAttribute('normal').array;
        expect(normals.some((value) => value !== 0)).toBe(true);
    });

    it('computes normals for a PLY mesh saved without them', async () => {
        spies.ply.mockImplementation(() => {
            const geometry = box();
            geometry.deleteAttribute('normal');
            return geometry;
        });
        await load('ply');

        expect(meshesOf(holderOf(frame().scene))[0].geometry.hasAttribute('normal')).toBe(true);
    });

    it('replaces the placeholder OBJ materials and keeps their shading', async () => {
        const original = new MeshPhongMaterial({ flatShading: true });
        const disposeOriginal = vi.spyOn(original, 'dispose');
        spies.obj.mockImplementation(() => meshGroup([original, new MeshPhongMaterial({ vertexColors: true })]));
        await load('obj');

        const [first, second] = meshesOf(holderOf(frame().scene))[0].material;
        expect(first).toBeInstanceOf(MeshStandardMaterial);
        expect(first.flatShading).toBe(true);
        expect(second.vertexColors).toBe(true);
        expect(disposeOriginal).toHaveBeenCalled();
    });

    it('leaves OBJ lines and points alone', async () => {
        spies.obj.mockImplementation(() => {
            const group = meshGroup(new MeshPhongMaterial());
            group.add(new Points(box(), new PointsMaterial()));
            return group;
        });
        await load('obj');

        const nodes = meshesOf(holderOf(frame().scene));
        expect(nodes[0].material).toBeInstanceOf(MeshStandardMaterial);
        expect(nodes[1].material.type).toBe('PointsMaterial');
    });

    it('gives uncoloured 3MF parts the print look and keeps coloured ones', async () => {
        const red = new MeshPhongMaterial({ name: 'Red', color: 0xff0000 });
        spies['3mf'].mockImplementation(() => {
            const group = meshGroup(new MeshPhongMaterial({ name: Loader.DEFAULT_MATERIAL_NAME }));
            group.add(new Mesh(box(), red));
            return group;
        });
        await load('3mf');

        const [plain, coloured] = meshesOf(holderOf(frame().scene));
        expect(plain.material).toBeInstanceOf(MeshStandardMaterial);
        expect(plain.material.flatShading).toBe(true);
        expect(coloured.material).toBe(red);
    });

    it('keeps the materials of a glTF that defines them', async () => {
        server.use(http.get('*/models/styled.gltf', () => HttpResponse.json({ asset: { version: '2.0' }, materials: [{ name: 'Paint' }] })));
        const paint = new MeshStandardMaterial({ color: 0x3366ff, metalness: 1 });
        spies.gltf.mockImplementation(async () => ({ scene: meshGroup(paint) }));
        await createModelViewer(container, { src: '/models/styled.gltf', format: 'gltf' });

        expect(meshesOf(holderOf(frame().scene))[0].material).toBe(paint);
    });

    it('replaces the chrome-like default of a glTF without materials', async () => {
        const fallback = new MeshStandardMaterial({ metalness: 1, roughness: 1 });
        spies.gltf.mockImplementation(async () => ({ scene: meshGroup(fallback) }));
        await load('gltf');

        const shown = meshesOf(holderOf(frame().scene))[0].material;
        expect(shown).not.toBe(fallback);
        expect(shown.metalness).toBeLessThan(0.2);
    });

    it('uses the first scene of a glTF without a default scene', async () => {
        const only = meshGroup(new MeshStandardMaterial());
        spies.gltf.mockImplementation(async () => ({ scene: undefined, scenes: [only] }));
        await load('gltf');

        expect(holderOf(frame().scene).children[0]).toBe(only);
    });

    it('shows a PLY without faces as a point cloud', async () => {
        server.use(http.get('*/models/scan.ply', () => new HttpResponse(encode(plyHeader(null)))));
        await createModelViewer(container, { src: '/models/scan.ply', format: 'ply' });

        const [cloud] = meshesOf(holderOf(frame().scene));
        expect(cloud.isPoints).toBe(true);
        expect(cloud.material.size).toBeGreaterThan(0);
    });

    it('treats "element face 0" as a point cloud and a PLY with faces as a mesh', async () => {
        server.use(http.get('*/models/zero.ply', () => new HttpResponse(encode(plyHeader(0)))));
        await createModelViewer(container, { src: '/models/zero.ply', format: 'ply' });
        expect(meshesOf(holderOf(frame().scene))[0].isPoints).toBe(true);

        await load('ply');
        expect(meshesOf(holderOf(frame().scene))[0].isMesh).toBe(true);
    });
});

describe('glTF files the preview cannot load', () => {
    const loadGltf = (json, name = 'model.gltf') => createModelViewer(container, {
        src: serve(name, encode(JSON.stringify({ asset: { version: '2.0' }, ...json }))),
        format: name.endsWith('.glb') ? 'glb' : 'gltf',
    });

    it.each([
        ['a separate .bin file', { buffers: [{ uri: 'scene.bin', byteLength: 10 }] }],
        ['a separate texture', { images: [{ uri: 'textures/wood.png' }] }],
        ['a texture on another site', { images: [{ uri: 'https://example.com/pixel.png' }] }],
    ])('explains how to fix a file that needs %s, without fetching it', async (label, json) => {
        await expect(loadGltf(json)).rejects.toMatchObject({ name: 'ModelViewerError', message: MESSAGES.gltfExternal });
        expect(spies.gltf).not.toHaveBeenCalled();
    });

    it('accepts data embedded in the file', async () => {
        await loadGltf({
            buffers: [{ uri: 'data:application/octet-stream;base64,AAAA', byteLength: 3 }],
            images: [{ uri: 'data:image/png;base64,AAAA' }, { bufferView: 0, mimeType: 'image/png' }],
        });

        expect(spies.gltf).toHaveBeenCalledTimes(1);
    });

    it('checks the JSON chunk of a .glb as well', async () => {
        const src = serve('external.glb', glb({ asset: { version: '2.0' }, buffers: [{ uri: 'external.bin' }] }));

        await expect(createModelViewer(container, { src, format: 'glb' })).rejects.toMatchObject({ message: MESSAGES.gltfExternal });
    });

    it('reads a .gltf that is really a binary .glb by its content', async () => {
        const src = serve('renamed.gltf', glb({ asset: { version: '2.0' }, images: [{ uri: 'a.png' }] }));

        await expect(createModelViewer(container, { src, format: 'gltf' })).rejects.toMatchObject({ message: MESSAGES.gltfExternal });
    });

    it.each([
        ['Draco, even when only listed as used', { extensionsUsed: ['KHR_draco_mesh_compression'] }],
        ['required Meshopt', { extensionsUsed: ['EXT_meshopt_compression'], extensionsRequired: ['EXT_meshopt_compression'] }],
        ['required Basis textures', { extensionsRequired: ['KHR_texture_basisu'] }],
    ])('explains that %s compression cannot be read', async (label, json) => {
        await expect(loadGltf(json)).rejects.toMatchObject({ message: MESSAGES.gltfCompressed });
        expect(spies.gltf).not.toHaveBeenCalled();
    });

    it('still loads a file that only offers Meshopt next to plain data', async () => {
        await loadGltf({ extensionsUsed: ['EXT_meshopt_compression'] });

        expect(spies.gltf).toHaveBeenCalledTimes(1);
    });

    it('calls a .gltf that is not JSON unreadable', async () => {
        const src = serve('broken.gltf', encode('{ not json'));

        await expect(createModelViewer(container, { src, format: 'gltf' })).rejects.toMatchObject({ message: MESSAGES.unreadable('gltf') });
    });

    it('calls a .glb without a JSON chunk unreadable', async () => {
        const src = serve('odd.glb', glb({ asset: {} }, { chunkType: 0x004e4942 }));

        await expect(createModelViewer(container, { src, format: 'glb' })).rejects.toMatchObject({ message: MESSAGES.unreadable('glb') });
    });
});

describe('files that cannot be shown', () => {
    it('calls a file the loader chokes on unreadable, naming its type', async () => {
        spies.stl.mockImplementation(() => {
            throw new RangeError('Offset is outside the bounds of the DataView');
        });

        const error = await load('stl').catch((err) => err);
        expect(error).toMatchObject({ name: 'ModelViewerError', message: MESSAGES.unreadable('stl') });
        expect(error.cause).toBeInstanceOf(RangeError);
    });

    it('calls a loader result that is not a model unreadable', async () => {
        spies['3mf'].mockImplementation(() => null);

        await expect(load('3mf')).rejects.toMatchObject({ message: MESSAGES.unreadable('3mf') });
    });

    it('rejects a binary file renamed to .obj without parsing it', async () => {
        const src = serve('binary.obj', new Uint8Array([0x76, 0x20, 0x00, 0x01, 0x02]));

        await expect(createModelViewer(container, { src, format: 'obj' })).rejects.toMatchObject({ message: MESSAGES.unreadable('obj') });
        expect(spies.obj).not.toHaveBeenCalled();
    });

    it('says so when the file has no shapes in it', async () => {
        spies.stl.mockImplementation(() => new BufferGeometry());

        await expect(load('stl')).rejects.toMatchObject({ message: MESSAGES.empty });
    });

    it('says so when every point of the model is the same', async () => {
        spies.stl.mockImplementation(() => new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(9).fill(3), 3)));

        await expect(load('stl')).rejects.toMatchObject({ message: MESSAGES.empty });
    });

    it('releases everything it built when a file cannot be shown', async () => {
        spies.stl.mockImplementation(() => new BufferGeometry());

        await load('stl').catch(() => {});

        expect(renderer().dispose).toHaveBeenCalledTimes(1);
        expect(renderer().forceContextLoss).toHaveBeenCalledTimes(1);
        expect(gl.pmrems[0].dispose).toHaveBeenCalledTimes(1);
        expect(gl.pmrems[0].target.dispose).toHaveBeenCalledTimes(1);
        expect(container.childNodes).toHaveLength(0);
    });
});

describe('downloading', () => {
    it('says the file is gone on a 404', async () => {
        server.use(http.get('*/models/gone.stl', () => new HttpResponse(null, { status: 404 })));

        await expect(createModelViewer(container, { src: '/models/gone.stl', format: 'stl' }))
            .rejects.toMatchObject({ name: 'ModelViewerError', message: MESSAGES.missing });
        expect(spies.stl).not.toHaveBeenCalled();
    });

    it('names the status of any other failed answer', async () => {
        server.use(http.get('*/models/busy.stl', () => new HttpResponse(null, { status: 503 })));

        await expect(createModelViewer(container, { src: '/models/busy.stl', format: 'stl' }))
            .rejects.toMatchObject({ message: MESSAGES.http(503) });
    });

    it('explains a lost connection', async () => {
        server.use(http.get('*/models/offline.stl', () => HttpResponse.error()));

        await expect(createModelViewer(container, { src: '/models/offline.stl', format: 'stl' }))
            .rejects.toMatchObject({ message: MESSAGES.network });
        expect(container.childNodes).toHaveLength(0);
        expect(renderer().forceContextLoss).toHaveBeenCalled();
    });

    it('reports progress against Content-Length', async () => {
        const chunks = [new Uint8Array(40), new Uint8Array(40), new Uint8Array(20)];
        server.use(http.get('*/models/big.stl', () => new HttpResponse(new ReadableStream({
            start(controller) {
                chunks.forEach((chunk) => controller.enqueue(chunk));
                controller.close();
            },
        }), { headers: { 'Content-Length': '100' } })));
        const onProgress = vi.fn();

        await createModelViewer(container, { src: '/models/big.stl', format: 'stl', onProgress });

        const reported = onProgress.mock.calls.map(([fraction]) => fraction);
        expect(reported.length).toBeGreaterThan(0);
        expect([...reported].sort((a, b) => a - b)).toEqual(reported);
        expect(reported[reported.length - 1]).toBe(1);
        expect(spies.stl.mock.calls[0][0].byteLength).toBe(100);
    });

    it('never reports more than everything when the answer is longer than announced', async () => {
        server.use(http.get('*/models/zipped.stl', () => new HttpResponse(new Uint8Array(300), { headers: { 'Content-Length': '100' } })));
        const onProgress = vi.fn();

        await createModelViewer(container, { src: '/models/zipped.stl', format: 'stl', onProgress });

        expect(Math.max(...onProgress.mock.calls.map(([fraction]) => fraction))).toBe(1);
    });

    it('loads without progress when the size is unknown', async () => {
        server.use(http.get('*/models/unsized.stl', () => new HttpResponse(new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(10));
                controller.close();
            },
        }))));
        const onProgress = vi.fn();

        await createModelViewer(container, { src: '/models/unsized.stl', format: 'stl', onProgress });

        expect(onProgress).not.toHaveBeenCalled();
        expect(spies.stl).toHaveBeenCalledTimes(1);
    });

    it('explains a connection that drops in the middle of the file', async () => {
        server.use(http.get('*/models/dropped.stl', () => new HttpResponse(new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(10));
                controller.error(new TypeError('network error'));
            },
        }), { headers: { 'Content-Length': '100' } })));

        await expect(createModelViewer(container, { src: '/models/dropped.stl', format: 'stl' }))
            .rejects.toMatchObject({ message: MESSAGES.network });
    });
});

describe('cancelling', () => {
    it('stops a download in progress and releases everything', async () => {
        let sendMore;
        server.use(http.get('*/models/slow.stl', () => new HttpResponse(new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(10));
                sendMore = () => controller.enqueue(new Uint8Array(10));
            },
        }), { headers: { 'Content-Length': '1000' } })));
        const controller = new AbortController();
        const onProgress = vi.fn();

        const pending = createModelViewer(container, { src: '/models/slow.stl', format: 'stl', signal: controller.signal, onProgress });
        await vi.waitFor(() => expect(onProgress).toHaveBeenCalled());
        controller.abort();
        const calls = onProgress.mock.calls.length;
        sendMore?.();

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(onProgress).toHaveBeenCalledTimes(calls);
        expect(spies.stl).not.toHaveBeenCalled();
        expect(renderer().dispose).toHaveBeenCalledTimes(1);
        expect(renderer().forceContextLoss).toHaveBeenCalledTimes(1);
        expect(container.childNodes).toHaveLength(0);
    });

    it('releases a model that finished parsing after the load was cancelled', async () => {
        const controller = new AbortController();
        const geometry = box().toNonIndexed();
        const disposeGeometry = vi.spyOn(geometry, 'dispose');
        spies.stl.mockImplementation(() => {
            controller.abort();
            return geometry;
        });

        await expect(load('stl', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
        expect(disposeGeometry).toHaveBeenCalled();
        expect(renderer().forceContextLoss).toHaveBeenCalledTimes(1);
    });
});

describe('dispose', () => {
    it('releases geometries, materials, textures, the renderer, the controls and the observers', async () => {
        const map = new Texture();
        const bitmap = { close: vi.fn() };
        map.source.data = bitmap;
        const material = new MeshStandardMaterial({ map });
        const geometry = box();
        spies.gltf.mockImplementation(async () => {
            const group = new Group();
            group.add(new Mesh(geometry, material));
            return { scene: group };
        });
        server.use(http.get('*/models/textured.gltf', () => HttpResponse.json({ asset: { version: '2.0' }, materials: [{}] })));
        const disposeControls = vi.spyOn(OrbitControls.prototype, 'dispose');
        const spiesOn = [vi.spyOn(geometry, 'dispose'), vi.spyOn(material, 'dispose'), vi.spyOn(map, 'dispose')];

        const viewer = await createModelViewer(container, { src: '/models/textured.gltf', format: 'gltf' });
        frame();
        viewer.dispose();

        spiesOn.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
        expect(bitmap.close).toHaveBeenCalledTimes(1);
        expect(renderer().setAnimationLoop).toHaveBeenLastCalledWith(null);
        expect(renderer().dispose).toHaveBeenCalledTimes(1);
        expect(renderer().forceContextLoss).toHaveBeenCalledTimes(1);
        expect(gl.pmrems[0].dispose).toHaveBeenCalledTimes(1);
        expect(gl.pmrems[0].target.dispose).toHaveBeenCalledTimes(1);
        expect(disposeControls).toHaveBeenCalledTimes(1);
        expect(observers.resize[0].disconnect).toHaveBeenCalledTimes(1);
        expect(observers.intersection[0].disconnect).toHaveBeenCalledTimes(1);
        expect(container.childNodes).toHaveLength(0);
    });

    it('can be called twice', async () => {
        const viewer = await load('stl');

        viewer.dispose();
        viewer.dispose();

        expect(renderer().dispose).toHaveBeenCalledTimes(1);
    });

    it('keeps releasing when one release fails', async () => {
        const viewer = await load('stl');
        gl.pmrems[0].dispose.mockImplementation(() => {
            throw new Error('already gone');
        });

        viewer.dispose();

        expect(renderer().forceContextLoss).toHaveBeenCalledTimes(1);
        expect(container.childNodes).toHaveLength(0);
    });

    it('stops listening to the page without a ResizeObserver', async () => {
        vi.stubGlobal('ResizeObserver', undefined);
        const remove = vi.spyOn(window, 'removeEventListener');
        const viewer = await load('stl');

        container.resizeTo(200, 200);
        window.dispatchEvent(new Event('resize'));
        expect(renderer().width).toBe(200);

        viewer.dispose();
        expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('turns its methods into no-ops afterwards', async () => {
        const viewer = await load('stl');
        viewer.dispose();
        const renders = renderer().renders.length;

        viewer.reset();
        viewer.rotate(1, 1);
        viewer.zoom(1);

        expect(renderer().renders).toHaveLength(renders);
        await expect(viewer.snapshot()).rejects.toMatchObject({ message: MESSAGES.closed });
    });
});

describe('snapshot', () => {
    beforeEach(() => {
        vi.stubGlobal('devicePixelRatio', 2);
    });

    it('renders one frame at the requested size and gives the view back its own size', async () => {
        const viewer = await load('stl');
        const blob = await viewer.snapshot({ width: 1200, height: 675, type: 'image/png' });

        expect(blob).toBeInstanceOf(Blob);
        const shot = renderer().renders.find((entry) => entry.width === 1200);
        expect(shot).toMatchObject({ height: 675, pixelRatio: 1, background: null });
        expect(renderer()).toMatchObject({ width: 400, height: 300, pixelRatio: 2 });
        // The view is drawn again at its own size in the same task, so nothing flickers.
        expect(lastRender()).toMatchObject({ width: 400, height: 300, pixelRatio: 2 });
        expect(lastRender().camera).not.toBe(shot.camera);
        expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('webgl2', expect.objectContaining({ preserveDrawingBuffer: false }));
    });

    it('uses the contract defaults', async () => {
        const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
        const viewer = await load('stl');

        await viewer.snapshot();

        expect(renderer().renders.some((entry) => entry.width === 1200 && entry.height === 675)).toBe(true);
        expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    });

    it('paints a white background for a type without transparency, and only for the snapshot', async () => {
        const viewer = await load('stl');

        await viewer.snapshot({ width: 800, height: 600, type: 'image/jpeg' });

        const shot = renderer().renders.find((entry) => entry.width === 800);
        expect(shot.background.getHex()).toBe(0xffffff);
        expect(shot.scene.background).toBeNull();
    });

    it('keeps everything in a picture narrower than the view by widening the field of view', async () => {
        const viewer = await load('stl');
        const view = frame().camera;

        await viewer.snapshot({ width: 300, height: 300 });
        await viewer.snapshot({ width: 1600, height: 900 });

        const square = renderer().renders.find((entry) => entry.width === 300).camera;
        const wide = renderer().renders.find((entry) => entry.width === 1600).camera;
        expect(square.aspect).toBe(1);
        expect(square.fov).toBeGreaterThan(view.fov);
        // Horizontally the square picture sees exactly what the view sees.
        const halfWidth = (camera) => Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
        expect(halfWidth(square)).toBeCloseTo(halfWidth(view));
        expect(wide.fov).toBe(view.fov);
        expect(square.position.equals(view.position)).toBe(true);
    });

    it('falls back to the default size for nonsense and caps huge pictures', async () => {
        const viewer = await load('stl');

        await viewer.snapshot({ width: 0, height: Number.NaN });
        await viewer.snapshot({ width: 99999, height: 50.6 });

        expect(renderer().renders.some((entry) => entry.width === 1200 && entry.height === 675)).toBe(true);
        expect(renderer().renders.some((entry) => entry.width === 4096 && entry.height === 51)).toBe(true);
    });

    it('rejects when the browser cannot encode the picture, and restores the view', async () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null));
        const viewer = await load('stl');

        await expect(viewer.snapshot({ type: 'image/jpeg' })).rejects.toMatchObject({ message: MESSAGES.snapshot });
        expect(renderer()).toMatchObject({ width: 400, height: 300, pixelRatio: 2 });
        expect(frame()?.scene.background ?? null).toBeNull();
    });

    it('rejects when drawing the picture fails', async () => {
        const viewer = await load('stl');
        renderer().render.mockImplementationOnce(() => {
            throw new Error('context lost');
        });

        const error = await viewer.snapshot().catch((err) => err);
        expect(error).toMatchObject({ message: MESSAGES.snapshot });
        expect(error.cause.message).toBe('context lost');
    });
});

describe('interaction', () => {
    it('turns slowly on its own and only draws when something moves', async () => {
        await load('stl', { autoRotate: true });

        expect(controlsOf().autoRotate).toBe(true);
        const first = azimuth(frame(0).camera);
        expect(frame(16)).not.toBeNull();
        const third = azimuth(frame(32).camera);
        // Turning left around the model, as OrbitControls auto-rotation does.
        expect(third).toBeLessThan(first);
    });

    it('stands still without auto-rotation and skips frames with nothing new', async () => {
        await load('stl', { autoRotate: false });

        expect(frame(0)).not.toBeNull();
        expect(frame(16)).toBeNull();
        expect(frame(32)).toBeNull();
    });

    it('can switch auto-rotation on and off until someone turns the model', async () => {
        const viewer = await load('stl', { autoRotate: false });

        viewer.setAutoRotate(true);
        expect(controlsOf().autoRotate).toBe(true);
        viewer.setAutoRotate(false);
        expect(controlsOf().autoRotate).toBe(false);
        viewer.setAutoRotate(true);

        controlsOf().dispatchEvent({ type: 'start' });
        expect(controlsOf().autoRotate).toBe(false);
        viewer.setAutoRotate(true);
        expect(controlsOf().autoRotate).toBe(false);
    });

    it('takes pointer input on its canvas when interactive', async () => {
        await load('stl');

        const canvas = container.querySelector('canvas');
        expect(controlsOf().domElement).toBe(canvas);
        expect(canvas.style.touchAction).toBe('none');
        expect(canvas.style.cursor).toBe('grab');
        expect(controlsOf().enableDamping).toBe(true);
    });

    it('leaves the page scrollable and takes no input when not interactive', async () => {
        await load('stl', { interactive: false });

        const canvas = container.querySelector('canvas');
        expect(controlsOf().domElement).toBeNull();
        expect(canvas.style.touchAction).toBe('');
    });

    it('moves the camera right and up for positive angles, and stops turning on its own', async () => {
        const viewer = await load('stl', { autoRotate: true });
        const before = frame(0).camera.position.clone();

        viewer.rotate(Math.PI / 2, 0);
        settle();
        const after = lastRender().camera.position.clone();

        expect(controlsOf().autoRotate).toBe(false);
        expect(Math.atan2(after.x, after.z) - Math.atan2(before.x, before.z)).toBeCloseTo(Math.PI / 2, 2);

        viewer.rotate(0, 0.2);
        settle();
        expect(lastRender().camera.position.y).toBeGreaterThan(after.y);
    });

    it('draws again after a zoom, which the controls apply at once', async () => {
        const viewer = await load('stl', { autoRotate: false });
        frame(0);
        expect(frame(16)).toBeNull();

        viewer.zoom(1);

        expect(frame(32)).not.toBeNull();
        expect(frame(48)).toBeNull();
    });

    it('draws again after a wheel zoom on the canvas, without scrolling the page', async () => {
        await load('stl', { autoRotate: false });
        const start = frame(0).camera.position.length();
        expect(frame(16)).toBeNull();

        const wheel = new WheelEvent('wheel', { deltaY: 500, deltaMode: 0, bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
        container.querySelector('canvas').dispatchEvent(wheel);

        const drawn = frame(32);
        expect(drawn).not.toBeNull();
        expect(drawn.camera.position.length()).toBeGreaterThan(start);
        expect(wheel.defaultPrevented).toBe(true);
    });

    it('zooms in and out in steps', async () => {
        const viewer = await load('stl', { autoRotate: false });
        const start = frame(0).camera.position.length();

        viewer.zoom(1);
        settle();
        const closer = lastRender().camera.position.length();
        viewer.zoom(-1);
        viewer.zoom(-1);
        settle();
        const farther = lastRender().camera.position.length();
        viewer.zoom(0);

        expect(closer).toBeCloseTo(start * 0.8);
        expect(farther).toBeCloseTo(start / 0.8);
    });

    it('resets to the first view after turning and zooming', async () => {
        const viewer = await load('stl', { autoRotate: false });
        const start = frame(0).camera.position.clone();

        viewer.rotate(1, 0.3);
        viewer.zoom(1);
        settle(20);
        viewer.reset();
        settle();

        expect(lastRender().camera.position.distanceTo(start)).toBeLessThan(1e-6 * start.length());
    });

    it('resets on a double-click when interactive', async () => {
        const viewer = await load('stl', { autoRotate: false });
        const start = frame(0).camera.position.clone();

        viewer.rotate(1, 0);
        settle();
        container.querySelector('canvas').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        settle();

        expect(lastRender().camera.position.distanceTo(start)).toBeLessThan(1e-6 * start.length());
    });
});

describe('page layout', () => {
    it('follows the size of its container', async () => {
        await load('stl', { autoRotate: false });
        const wide = frame(0).camera.position.length();

        container.resizeTo(200, 400);
        observers.resize[0].callback([]);
        const tall = frame(16);

        expect(renderer()).toMatchObject({ width: 200, height: 400 });
        expect(tall.camera.aspect).toBeCloseTo(0.5);
        // A narrower view needs the camera farther away to keep the whole model in it.
        expect(tall.camera.position.length()).toBeGreaterThan(wide);
    });

    it('keeps the camera where the user put it when the container changes size', async () => {
        const viewer = await load('stl', { autoRotate: false });
        frame(0);
        viewer.zoom(1);
        settle();
        const zoomed = lastRender().camera.position.length();

        container.resizeTo(200, 400);
        observers.resize[0].callback([]);
        settle();

        expect(lastRender().camera.position.length()).toBeCloseTo(zoomed);
    });

    it('ignores a container that collapses while hidden', async () => {
        await load('stl');

        container.resizeTo(0, 0);
        observers.resize[0].callback([]);

        expect(renderer()).toMatchObject({ width: 400, height: 300 });
    });

    it('stops drawing while scrolled out of sight', async () => {
        await load('stl');
        const visibility = observers.intersection[0];
        expect(visibility.observe).toHaveBeenCalledWith(container);

        visibility.callback([{ isIntersecting: false }]);
        expect(renderer().setAnimationLoop).toHaveBeenLastCalledWith(null);

        visibility.callback([{ isIntersecting: false }, { isIntersecting: true }]);
        expect(renderer().setAnimationLoop).toHaveBeenLastCalledWith(expect.any(Function));
        expect(frame(0)).not.toBeNull();
    });

    it('keeps drawing in a browser without IntersectionObserver', async () => {
        vi.stubGlobal('IntersectionObserver', undefined);
        await load('stl');

        expect(renderer().setAnimationLoop).toHaveBeenLastCalledWith(expect.any(Function));
        expect(frame(0)).not.toBeNull();
    });
});
