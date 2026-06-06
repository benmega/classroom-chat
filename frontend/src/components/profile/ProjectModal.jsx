import React from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Code, CheckCircle, FileText } from 'lucide-react';
import { formatStaticUrl } from '../../utils/formatters';
import SmartImage from '../common/SmartImage';

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

const ProjectModal = ({ project, onClose }) => {
    if (!project) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content project-modal" onClick={e => e.stopPropagation()}>
                <button className="close-modal" onClick={onClose}><X size={24} /></button>
                <div className="modal-header">
                    <h2>{project.name}</h2>
                    <div className="modal-actions">
                        {project.link && <a href={project.link} className="btn-primary" target="_blank" rel="noreferrer"><ExternalLink size={18} /> Launch Live</a>}
                        {project.github_link && <a href={project.github_link} className="btn-secondary" target="_blank" rel="noreferrer"><Code size={18} /> Source</a>}
                    </div>
                </div>
                <div className="modal-body">
                    <div className="modal-main">
                        <div className="video-spotlight">
                            {project.video_url ? (
                                getYoutubeEmbedUrl(project.video_url) ? (
                                    <iframe 
                                        src={getYoutubeEmbedUrl(project.video_url)} 
                                        title="Project Video Presentation"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <video 
                                        src={project.video_url} 
                                        controls 
                                        className="direct-video-player"
                                        poster={project.image_url ? formatStaticUrl(project.image_url) : null}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                )
                            ) : (
                                <SmartImage 
                                    src={formatStaticUrl(project.image_url)} 
                                    alt={project.name} 
                                    fallbackType="project"
                                />
                            )}
                        </div>
                        <h3 className="section-heading"><FileText size={18} /> Description</h3>
                        <p>{project.description}</p>
                        {project.teacher_comment && (
                            <div className="teacher-feedback">
                                <h4><CheckCircle size={16} /> Instructor Review</h4>
                                <blockquote>"{project.teacher_comment}"</blockquote>
                            </div>
                        )}
                    </div>
                    <div className="modal-sidebar">
                        <h3>Technical Logic</h3>
                        {project.code_snippet ? (
                            <pre className="code-snippet"><code>{project.code_snippet}</code></pre>
                        ) : (
                            <div className="no-code">Source code preview not available.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProjectModal;
