import { describe, it, expect } from 'vitest';
import { MODEL_MIME_TYPES, modelFormatFromName } from './modelFormats';

describe('MODEL_MIME_TYPES', () => {
    it('covers exactly the model extensions of the project files contract', () => {
        expect(Object.keys(MODEL_MIME_TYPES).sort()).toEqual(['3mf', 'glb', 'gltf', 'obj', 'ply', 'stl']);
    });

    it('uses the content types the backend serves', () => {
        expect(MODEL_MIME_TYPES).toEqual({
            stl: 'model/stl',
            obj: 'model/obj',
            glb: 'model/gltf-binary',
            gltf: 'model/gltf+json',
            '3mf': 'model/3mf',
            ply: 'application/octet-stream',
        });
    });

    it('cannot be changed by a caller', () => {
        expect(Object.isFrozen(MODEL_MIME_TYPES)).toBe(true);
    });
});

describe('modelFormatFromName', () => {
    it.each([
        ['robot.stl', 'stl'],
        ['chair.obj', 'obj'],
        ['scene.glb', 'glb'],
        ['scene.gltf', 'gltf'],
        ['print.3mf', '3mf'],
        ['scan.ply', 'ply'],
    ])('reads %s as %s', (name, format) => {
        expect(modelFormatFromName(name)).toBe(format);
    });

    it('ignores the case of the extension', () => {
        expect(modelFormatFromName('ROBOT.STL')).toBe('stl');
        expect(modelFormatFromName('Print.3MF')).toBe('3mf');
        expect(modelFormatFromName('Scene.GlTf')).toBe('gltf');
    });

    it('uses only the last extension of a name with several dots', () => {
        expect(modelFormatFromName('robot.v2.final.stl')).toBe('stl');
        expect(modelFormatFromName('robot.stl.txt')).toBeNull();
        expect(modelFormatFromName('robot.stl.zip')).toBeNull();
    });

    it('reads the file name at the end of a path or an API URL', () => {
        expect(modelFormatFromName('models/robot.stl')).toBe('stl');
        expect(modelFormatFromName('/user/project_files/12/robot.stl')).toBe('stl');
        expect(modelFormatFromName('http://localhost:8000/user/project_files/12/robot.glb')).toBe('glb');
        expect(modelFormatFromName('https://api.example.com/user/project_files/7/arm.3mf')).toBe('3mf');
        expect(modelFormatFromName('C:\\Users\\student\\Desktop\\robot.obj')).toBe('obj');
    });

    it('ignores a query string or a fragment', () => {
        expect(modelFormatFromName('/user/project_files/12/robot.stl?download=1')).toBe('stl');
        expect(modelFormatFromName('https://example.com/a/robot.ply#view')).toBe('ply');
        expect(modelFormatFromName('robot.stl?x=1#y')).toBe('stl');
    });

    it('is not fooled by an extension that only appears in the query string or the fragment', () => {
        expect(modelFormatFromName('/download?file=robot.stl')).toBeNull();
        expect(modelFormatFromName('/user/project_files/12/readme#robot.stl')).toBeNull();
        expect(modelFormatFromName('https://example.com/get?name=robot.glb')).toBeNull();
    });

    it('does not read a host name as a file name', () => {
        expect(modelFormatFromName('https://example.com')).toBeNull();
        expect(modelFormatFromName('https://robot.stl')).toBeNull();
        expect(modelFormatFromName('https://robot.stl/')).toBeNull();
    });

    it('returns null for blob: URLs, which hold no file name', () => {
        expect(modelFormatFromName('blob:http://localhost:5173/3f0c2a1e-6b1d-4c1f-9d55-0c2b8f1e7a10')).toBeNull();
        expect(modelFormatFromName('blob:https://classroom.example.com/3f0c2a1e-6b1d-4c1f-9d55-0c2b8f1e7a10')).toBeNull();
    });

    it('returns null for data: URLs, whatever their payload says', () => {
        expect(modelFormatFromName('data:model/stl;base64,c29saWQgY3ViZQ==')).toBeNull();
        expect(modelFormatFromName('data:text/plain,robot.stl')).toBeNull();
    });

    it('decodes a percent-encoded file name', () => {
        expect(modelFormatFromName('/user/project_files/3/my%20robot.stl')).toBe('stl');
        expect(modelFormatFromName('/user/project_files/3/robot%2Eglb')).toBe('glb');
    });

    it('keeps a name with a stray percent sign readable', () => {
        expect(modelFormatFromName('100%.stl')).toBe('stl');
        expect(modelFormatFromName('/files/50%off.obj?x=1')).toBe('obj');
    });

    it('returns null without an extension', () => {
        expect(modelFormatFromName('robot')).toBeNull();
        expect(modelFormatFromName('robot.')).toBeNull();
        expect(modelFormatFromName('models/')).toBeNull();
        expect(modelFormatFromName('/user/project_files/12/')).toBeNull();
    });

    it('treats a leading dot as a hidden file name, not an extension', () => {
        expect(modelFormatFromName('.stl')).toBeNull();
        expect(modelFormatFromName('models/.glb')).toBeNull();
    });

    it('returns null for formats the viewer cannot show', () => {
        expect(modelFormatFromName('robot.fbx')).toBeNull();
        expect(modelFormatFromName('robot.blend')).toBeNull();
        expect(modelFormatFromName('main.py')).toBeNull();
        expect(modelFormatFromName('cover.png')).toBeNull();
    });

    it('ignores surrounding whitespace', () => {
        expect(modelFormatFromName('  robot.stl \n')).toBe('stl');
    });

    it('returns null for an empty or missing name', () => {
        expect(modelFormatFromName('')).toBeNull();
        expect(modelFormatFromName('   ')).toBeNull();
        expect(modelFormatFromName(null)).toBeNull();
        expect(modelFormatFromName(undefined)).toBeNull();
        expect(modelFormatFromName(42)).toBeNull();
        expect(modelFormatFromName({ name: 'robot.stl' })).toBeNull();
    });

    it('returns null for an absolute URL the browser cannot parse', () => {
        expect(modelFormatFromName('http://exa mple.com/robot.stl')).toBeNull();
    });

    it('does not mistake properties every object has for formats', () => {
        expect(modelFormatFromName('robot.constructor')).toBeNull();
        expect(modelFormatFromName('robot.toString')).toBeNull();
        expect(modelFormatFromName('robot.__proto__')).toBeNull();
    });
});
