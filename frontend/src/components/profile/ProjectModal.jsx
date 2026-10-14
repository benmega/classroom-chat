import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Code, FileText, Download, Box, Video, Image as ImageIcon, Images } from 'lucide-react';
import { formatStaticUrl } from '../../utils/formatters';
import { safeUrl } from '../../utils/safeUrl';
import { getFeedbackStyle } from '../../utils/projectFeedback';
import { groupProjectFiles, primaryModelFile, projectFileUrl, languageForFile } from '../../utils/projectFiles';
import SmartImage from '../common/SmartImage';
import ModelViewer from '../common/ModelViewer';
import ProjectFileBrowser from '../common/ProjectFileBrowser';
import CodeView from '../common/CodeView';
import AssetGallery from '../common/AssetGallery';
import useModalA11y from '../../hooks/useModalA11y';

const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
        const ytRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?/\s]{11})/i;
        const ytMatch = url.match(ytRegex);
        const ytId = ytMatch ? ytMatch[1] : null;

        if (ytId) {
            return `https://www.youtube.com/embed/${ytId}?rel=0`;
        }

        if (url.includes('vimeo.com')) {
            const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
            const vimeoMatch = url.match(vimeoRegex);
            if (vimeoMatch) {
                return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
            }
        }

        return null;
    } catch (e) {
        console.error("Error parsing video URL:", e);
        return null;
    }
};

// What the spotlight can show, in the order the switcher offers it: for a 3D project the model is the
// work itself, a video shows a program running, and the cover image is what is left.
const SPOTLIGHT_MEDIA = {
    model: { label: '3D Model', Icon: Box },
    video: { label: 'Video', Icon: Video },
    image: { label: 'Cover', Icon: ImageIcon },
};

// Data, markup and prose formats. A pasted snippet is program logic, so these never decide how it is
// highlighted, even in a project with more of them (level JSON, a README) than code files.
const NON_LOGIC_LANGUAGES = new Set(['json', 'markdown', 'plaintext', 'text', 'yaml', 'ini', 'toml', 'xml', 'html', 'css', 'scss', 'csv']);

// The pasted snippet has no file name, so it is highlighted as the language most of the project's code
// files share; null (plain text) when none of them is code.
const snippetLanguage = (sources) => {
    const counts = new Map();
    for (const file of sources) {
        const language = languageForFile(file.name);
        if (language && !NON_LOGIC_LANGUAGES.has(language)) counts.set(language, (counts.get(language) || 0) + 1);
    }
    let best = null;
    for (const [language, count] of counts) {
        if (best === null || count > counts.get(best)) best = language;
    }
    return best;
};

const VideoPlayer = ({ project }) => {
    const embedUrl = getYoutubeEmbedUrl(project.video_url);
    if (embedUrl) {
        return (
            <iframe
                src={embedUrl}
                title="Project Video Presentation"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        );
    }
    return (
        <video
            src={project.video_url}
            controls
            className="direct-video-player"
            poster={project.image_url ? formatStaticUrl(project.image_url) : null}
        >
            <track kind="captions" />
            Your browser does not support the video tag.
        </video>
    );
};

// The big frame at the top of the modal. With more than one medium a tab strip switches between them.
// The choice belongs to one project, which is why the modal keys this component by project.
const ProjectSpotlight = ({ project, modelFile }) => {
    const media = Object.keys(SPOTLIGHT_MEDIA).filter((medium) => (
        (medium === 'model' && modelFile) || (medium === 'video' && project.video_url) || (medium === 'image' && project.image_url)
    ));
    const [selected, setSelected] = useState(media[0]);
    const tabRefs = useRef({});
    const baseId = useId();
    const active = media.includes(selected) ? selected : media[0];

    let content;
    if (active === 'model') {
        content = (
            <ModelViewer
                src={projectFileUrl(modelFile)}
                filename={modelFile.name}
                downloadUrl={projectFileUrl(modelFile, { download: true })}
                ariaLabel={`3D model of ${project.name}`}
            />
        );
    } else if (active === 'video') {
        content = <VideoPlayer project={project} />;
    } else {
        // Also the frame of a project with no media at all: SmartImage then shows the placeholder picture.
        content = (
            <SmartImage
                src={formatStaticUrl(project.image_url)}
                alt={project.name}
                fallbackType="project"
            />
        );
    }

    if (media.length < 2) return <div className="video-spotlight">{content}</div>;

    // Arrow keys, Home and End move along the strip and select as they go. Only the selected tab is in
    // the Tab order, so the strip costs a keyboard user one stop instead of three.
    const handleKeyDown = (event, medium) => {
        const index = media.indexOf(medium);
        const next = {
            ArrowRight: media[(index + 1) % media.length],
            ArrowLeft: media[(index - 1 + media.length) % media.length],
            Home: media[0],
            End: media[media.length - 1],
        }[event.key];
        if (!next) return;
        event.preventDefault();
        setSelected(next);
        tabRefs.current[next].focus();
    };

    return (
        <div className="project-spotlight">
            <div role="tablist" aria-label="Project media" className="spotlight-tabs">
                {media.map((medium) => {
                    const { label, Icon } = SPOTLIGHT_MEDIA[medium];
                    const isActive = medium === active;
                    return (
                        <button
                            key={medium}
                            ref={(element) => { tabRefs.current[medium] = element; }}
                            type="button"
                            role="tab"
                            id={`${baseId}-${medium}-tab`}
                            aria-selected={isActive}
                            aria-controls={`${baseId}-panel`}
                            tabIndex={isActive ? 0 : -1}
                            className="spotlight-tab"
                            onClick={() => setSelected(medium)}
                            onKeyDown={(event) => handleKeyDown(event, medium)}
                        >
                            <Icon size={16} aria-hidden="true" /> {label}
                        </button>
                    );
                })}
            </div>
            <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${active}-tab`} tabIndex={0} className="video-spotlight">
                {content}
            </div>
        </div>
    );
};

const ProjectModal = ({ project, onClose }) => {
    const dialogRef = useRef(null);
    const titleId = useId();

    useModalA11y({ isOpen: Boolean(project), onClose, containerRef: dialogRef });

    if (!project) return null;

    const { Icon: FeedbackIcon, className: feedbackClass, reviewTitle } = getFeedbackStyle(project.status);
    // Responses from before projects had files, and callers that do not load them, carry no list.
    const files = project.files || [];
    const { sources, assets } = groupProjectFiles(files);
    const modelFile = primaryModelFile(files);
    const hasSources = sources.length > 0;

    return createPortal(
        <div role="presentation" className="profile-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={`modal-content project-modal${hasSources ? ' has-source-files' : ''}`}>
                <button className="close-modal" onClick={onClose} aria-label="Close"><X size={24} /></button>
                <div className="modal-header">
                    <h2 id={titleId}>{project.name}</h2>
                    <div className="profile-modal-actions">
                        {safeUrl(project.link) && <a href={safeUrl(project.link)} className="btn-primary" target="_blank" rel="noreferrer"><ExternalLink size={18} /> Launch Live</a>}
                        {safeUrl(project.github_link) && <a href={safeUrl(project.github_link)} className="btn-secondary" target="_blank" rel="noreferrer"><Code size={18} /> Source</a>}
                        {modelFile && (
                            <a href={projectFileUrl(modelFile, { download: true })} download={modelFile.name} className="btn-secondary" title={`Download ${modelFile.name}`}>
                                <Download size={18} aria-hidden="true" /> Download model
                            </a>
                        )}
                    </div>
                </div>
                <div className="modal-body">
                    <div className="modal-main">
                        <ProjectSpotlight key={project.id ?? project.name} project={project} modelFile={modelFile} />
                        <h3 className="section-heading"><FileText size={18} /> Description</h3>
                        <p>{project.description}</p>
                        {assets.length > 0 && (
                            <>
                                <h3 className="section-heading"><Images size={18} aria-hidden="true" /> Assets</h3>
                                <AssetGallery files={files} />
                            </>
                        )}
                        {project.teacher_comment && (
                            <div className={`teacher-feedback ${feedbackClass}`}>
                                <h4>
                                    <FeedbackIcon size={16} /> {reviewTitle}
                                </h4>
                                <blockquote>"{project.teacher_comment}"</blockquote>
                            </div>
                        )}
                    </div>
                    <div className="modal-sidebar">
                        <h3>Technical Logic</h3>
                        {hasSources ? (
                            <>
                                <ProjectFileBrowser files={files} maxHeight="420px" />
                                {project.code_snippet && (
                                    <>
                                        <h4 className="snippet-heading">Highlighted snippet</h4>
                                        <CodeView code={project.code_snippet} language={snippetLanguage(sources)} maxHeight="280px" />
                                    </>
                                )}
                            </>
                        ) : project.code_snippet ? (
                            <pre className="code-snippet"><code>{project.code_snippet}</code></pre>
                        ) : (
                            <div className="no-code">
                                {project.project_type === '3d' ? 'This is a 3D modelling project.' : 'Source code preview not available.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProjectModal;
