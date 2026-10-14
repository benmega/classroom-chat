import { useState } from 'react';
import { FileText, ImageOff, Music } from 'lucide-react';
import { extensionOf, formatFileSize, groupProjectFiles, projectFileUrl } from '../../utils/projectFiles';
import './AssetGallery.css';

// The asset types a browser shows or plays itself; anything else is offered as a download
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'];

const assetTypeOf = (file) => {
    const extension = extensionOf(file.name);
    if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
    if (AUDIO_EXTENSIONS.includes(extension)) return 'audio';
    return 'other';
};

// An image tile that opens the picture in a new tab. A picture that fails to load leaves the file name
// in its place, so the tile still says what it is.
const AssetThumb = ({ file }) => {
    const [broken, setBroken] = useState(false);
    const url = projectFileUrl(file);
    return (
        <a className="asset-gallery-thumb" href={url} target="_blank" rel="noreferrer" title={`Open ${file.name} in a new tab`}>
            {broken ? (
                <span className="asset-gallery-broken">
                    <ImageOff size={24} aria-hidden="true" />
                    <span>{file.name}</span>
                </span>
            ) : (
                <img src={url} alt={file.name} loading="lazy" decoding="async" onError={() => setBroken(true)} />
            )}
        </a>
    );
};

// A project's asset files: images as a grid of thumbnails, sounds with a player, and the rest (PDFs)
// as download links with their size. `files` is the project's whole file list; only assets are shown.
// Renders nothing when there are none.
const AssetGallery = ({ files }) => {
    const { assets } = groupProjectFiles(files);
    if (assets.length === 0) return null;

    const ofType = (type) => assets.filter((file) => assetTypeOf(file) === type);
    const images = ofType('image');
    const sounds = ofType('audio');
    const others = ofType('other');

    return (
        <section className="asset-gallery" aria-label="Project assets">
            {images.length > 0 && (
                <ul className="asset-gallery-grid">
                    {images.map((file) => (
                        <li key={file.id}><AssetThumb file={file} /></li>
                    ))}
                </ul>
            )}
            {sounds.length > 0 && (
                <ul className="asset-gallery-list">
                    {sounds.map((file) => (
                        <li key={file.id} className="asset-gallery-sound">
                            <span className="asset-gallery-name">
                                <Music size={16} aria-hidden="true" />
                                {file.name}
                            </span>
                            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- sound effects and music have no speech to caption */}
                            <audio controls preload="none" src={projectFileUrl(file)} aria-label={file.name} />
                        </li>
                    ))}
                </ul>
            )}
            {others.length > 0 && (
                <ul className="asset-gallery-list">
                    {others.map((file) => (
                        <li key={file.id}>
                            <a className="asset-gallery-file" href={projectFileUrl(file, { download: true })} download={file.name}>
                                <FileText size={16} aria-hidden="true" />
                                <span className="asset-gallery-name">{file.name}</span>
                                <span className="asset-gallery-size">{formatFileSize(file.size)}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default AssetGallery;
