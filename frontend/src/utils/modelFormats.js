// The model formats the 3D viewer can show (the "model" file kind of the project files contract),
// with the content type the backend serves each one as. A File or Blob built in the browser uses
// the same types, so a local preview and the uploaded file look alike to anything that checks.
export const MODEL_MIME_TYPES = Object.freeze({
    stl: 'model/stl',
    obj: 'model/obj',
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    '3mf': 'model/3mf',
    // There is no registered type for PLY; the backend serves it as plain bytes.
    ply: 'application/octet-stream',
});

const FORMATS = Object.keys(MODEL_MIME_TYPES);

// Matches a URL with a scheme and an authority ("https://host/..."), whose host must not be read as
// a file name: "https://example.com" has no extension, while "C:\models\robot.stl" is a plain path.
const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:\/\//i;

const decode = (text) => {
    try {
        return decodeURIComponent(text);
    } catch {
        // A stray "%" in a file name: the raw text is still the best guess.
        return text;
    }
};

// The path part of a name or URL: a query string or fragment ("?download=1") must neither hide
// nor fake the extension, and a blob: URL only wraps an origin and an opaque id.
const pathOf = (value) => {
    const unwrapped = value.replace(/^blob:/i, '');
    if (ABSOLUTE_URL.test(unwrapped)) {
        try {
            return new URL(unwrapped).pathname;
        } catch {
            return '';
        }
    }
    return unwrapped.split(/[?#]/, 1)[0];
};

/**
 * The viewer format for a file name, path or URL: one of the MODEL_MIME_TYPES keys, or null when the
 * name has no extension the viewer can show. Only the last path segment counts, case-insensitively,
 * so "/user/project_files/12/Robot.STL?download=1" is 'stl' while a blob: URL or "model.stl.txt" is null.
 */
export const modelFormatFromName = (name) => {
    if (typeof name !== 'string') return null;
    const value = name.trim();
    // A data: URL carries a type, not a name, and its payload can contain anything.
    if (!value || /^data:/i.test(value)) return null;

    const segment = decode(pathOf(value).split(/[/\\]/).pop());
    const dot = segment.lastIndexOf('.');
    // No dot, or only a leading one: ".stl" is a hidden file without an extension.
    if (dot <= 0) return null;

    const extension = segment.slice(dot + 1).toLowerCase();
    return FORMATS.includes(extension) ? extension : null;
};
