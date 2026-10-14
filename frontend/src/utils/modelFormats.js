// STUB from the fe-editor lane. This module belongs to the fe-viewer lane (contract 4.2), whose version replaces
// this file when the lanes are merged.
export const MODEL_MIME_TYPES = {
    stl: 'model/stl',
    obj: 'model/obj',
    glb: 'model/gltf-binary',
    gltf: 'model/gltf+json',
    '3mf': 'model/3mf',
    ply: 'application/octet-stream',
};

export const modelFormatFromName = (name) => {
    const match = /\.([a-z0-9]+)$/i.exec(String(name || ''));
    const extension = match ? match[1].toLowerCase() : '';
    return Object.keys(MODEL_MIME_TYPES).includes(extension) ? extension : null;
};
