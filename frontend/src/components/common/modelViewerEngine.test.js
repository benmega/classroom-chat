import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Vector3 } from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { createModelViewer, MESSAGES } from './modelViewerEngine';

// The real engine with the real three.js, nothing mocked: happy-dom has no WebGL, like a browser with
// WebGL turned off, so this is the path such a browser takes. The scene itself is tested in
// modelViewerEngine.scene.test.js with a stand-in renderer.

// Not new URL(..., import.meta.url): happy-dom's URL does not resolve file: URLs.
const fixturePath = path.resolve(import.meta.dirname, '../../test/fixtures/cube.stl');

describe('createModelViewer in a browser without WebGL', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('rejects with a readable error and downloads nothing', async () => {
        const container = document.body.appendChild(document.createElement('div'));
        const fetchSpy = vi.spyOn(window, 'fetch');

        const error = await createModelViewer(container, { src: '/user/project_files/1/cube.stl', format: 'stl' })
            .catch((err) => err);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ModelViewerError');
        expect(error.message).toBe(MESSAGES.webgl);
        expect(error.message).not.toMatch(/THREE|context/i);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(container.childNodes).toHaveLength(0);
    });

    it('rejects a format it cannot show before it asks for WebGL', async () => {
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');

        await expect(createModelViewer(document.createElement('div'), { src: '/m/robot.fbx', format: 'fbx' }))
            .rejects.toMatchObject({ name: 'ModelViewerError', message: MESSAGES.unsupported });
        await expect(createModelViewer(document.createElement('div'), { src: '/m/robot', format: undefined }))
            .rejects.toMatchObject({ message: MESSAGES.unsupported });
        // Names every object has are not formats.
        await expect(createModelViewer(document.createElement('div'), { src: '/m/robot', format: 'constructor' }))
            .rejects.toMatchObject({ message: MESSAGES.unsupported });
        expect(getContext).not.toHaveBeenCalled();
    });

    it('rejects with the abort reason when it was cancelled before it started', async () => {
        const controller = new AbortController();
        const reason = new DOMException('Gone', 'AbortError');
        controller.abort(reason);

        await expect(createModelViewer(document.createElement('div'), { src: '/m/a.stl', format: 'stl', signal: controller.signal }))
            .rejects.toBe(reason);
    });

    it('has a message for every way a load can fail', () => {
        for (const message of [MESSAGES.webgl, MESSAGES.unsupported, MESSAGES.network, MESSAGES.missing, MESSAGES.empty,
            MESSAGES.gltfExternal, MESSAGES.gltfCompressed, MESSAGES.snapshot, MESSAGES.closed]) {
            expect(message).toMatch(/^[A-Z].*\.$/);
            expect(message).not.toMatch(/—/);
        }
        expect(MESSAGES.http(503)).toContain('503');
        expect(MESSAGES.unreadable('3mf')).toContain('.3mf');
        expect(MESSAGES.gltfExternal).toContain('.glb');
    });
});

describe('cube.stl fixture', () => {
    const bytes = readFileSync(fixturePath);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    it('is an ASCII STL, as the upload check expects', () => {
        expect(bytes.toString('latin1').startsWith('solid')).toBe(true);
        expect(bytes.toString('latin1').match(/endfacet/g)).toHaveLength(12);
    });

    it('parses into 12 triangles of a 10 mm cube', () => {
        const geometry = new STLLoader().parse(buffer);
        geometry.computeBoundingBox();

        expect(geometry.getAttribute('position').count).toBe(36);
        expect(geometry.boundingBox.min.toArray()).toEqual([0, 0, 0]);
        expect(geometry.boundingBox.max.toArray()).toEqual([10, 10, 10]);
    });

    it('has outward normals that match the winding of every facet', () => {
        const geometry = new STLLoader().parse(buffer);
        const position = geometry.getAttribute('position');
        const normal = geometry.getAttribute('normal');
        const centre = new Vector3(5, 5, 5);
        const [a, b, c, stored, wound] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];

        for (let i = 0; i < position.count; i += 3) {
            a.fromBufferAttribute(position, i);
            b.fromBufferAttribute(position, i + 1);
            c.fromBufferAttribute(position, i + 2);
            stored.fromBufferAttribute(normal, i);
            wound.subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
            const middle = new Vector3().add(a).add(b).add(c).divideScalar(3);

            expect(wound.distanceTo(stored)).toBeLessThan(1e-6);
            expect(stored.dot(middle.sub(centre))).toBeGreaterThan(0);
        }
    });
});
