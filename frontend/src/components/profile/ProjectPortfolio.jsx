import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Code, Play, Settings, ExternalLink, Layers, Clock, AlertCircle, Box, Files, Rotate3d } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import { formatStaticUrl } from '../../utils/formatters';
import { safeUrl } from '../../utils/safeUrl';
import { getFeedbackStyle } from '../../utils/projectFeedback';
import { groupProjectFiles, primaryModelFile } from '../../utils/projectFiles';

// Cut long text for the card; short or missing text gets no ellipsis.
const truncate = (text, max = 80) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}...` : text;
};

// The teacher's note on a card, styled by the review status.
const CardFeedback = ({ project }) => {
    const { Icon, className } = getFeedbackStyle(project.status);
    return (
        <div className={`card-teacher-feedback ${className}`}>
            <Icon size={14} /> {truncate(project.teacher_comment)}
        </div>
    );
};

// What a card holds besides its picture. A 3D model and source files each get a chip in the corner, and a
// model without a video gets a quiet rotate glyph where a video gets its play button.
const ThumbFileHints = ({ project }) => {
    const files = project.files || [];
    const hasModel = Boolean(primaryModelFile(files));
    const sourceCount = groupProjectFiles(files).sources.length;
    const fileWord = sourceCount === 1 ? 'file' : 'files';

    return (
        <>
            {hasModel && !project.video_url && (
                <div className="model-overlay" aria-hidden="true"><Rotate3d size={20} /></div>
            )}
            {(hasModel || sourceCount > 0) && (
                <div className="project-file-chips">
                    {hasModel && (
                        <span className="project-file-chip" title="Has a 3D model"><Box size={12} aria-hidden="true" /> 3D</span>
                    )}
                    {sourceCount > 0 && (
                        <span className="project-file-chip" title={`${sourceCount} source ${fileWord}`}><Files size={12} aria-hidden="true" /> {sourceCount} {fileWord}</span>
                    )}
                </div>
            )}
        </>
    );
};

const ProjectPortfolio = ({ projects, isOwner, setSelectedProject, studentId }) => {
    const navigate = useNavigate();

    const sortedProjects = projects ? [...projects].sort((a, b) => b.id - a.id) : [];

    if (sortedProjects.length === 0 && !isOwner) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header d-flex justify-between align-center">
                <h2><Layers size={20} /> Projects Portfolio</h2>
                {isOwner && (
                    <Link to={studentId ? `/project/new?student_id=${studentId}` : "/project/new"} title="Add Project" className="text-secondary d-flex align-center">
                        <Plus size={20} />
                    </Link>
                )}
            </div>
            <div className="projects-grid-container">
                {sortedProjects.length === 0 ? (
                    <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No projects yet. Click the + icon to add your first project!
                    </p>
                ) : (
                    <div className="projects-grid">
                        {sortedProjects.map(project => (
                            <div key={project.id} className="project-card">
                                <div role="button" tabIndex={0} data-testid="project-thumb" className="project-thumb" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedProject(project)}>
                                    <SmartImage 
                                        src={formatStaticUrl(project.image_url)} 
                                        alt={project.name} 
                                        fallbackType="project"
                                    />
                                    {project.video_url && <div className="play-overlay"><Play size={24} fill="currentColor" /></div>}
                                    {project.status === 'rejected' ? (
                                        <span className="rejected-badge" title="Revision Requested">
                                            <AlertCircle size={12} /> Revision Requested
                                        </span>
                                    ) : project.status === 'pending' ? (
                                        <span className="in-progress-badge" title="Pending Admin Approval">
                                            <Clock size={12} /> In Progress
                                        </span>
                                    ) : null}
                                    <ThumbFileHints project={project} />
                                </div>
                                <div className="project-content">
                                    <h3>{project.name}</h3>
                                    
                                    {project.teacher_comment && <CardFeedback project={project} />}

                                    {project.description && <p>{truncate(project.description)}</p>}
                                    <div className="project-footer">
                                        {safeUrl(project.link) && <a href={safeUrl(project.link)} target="_blank" rel="noreferrer" className="link-icon" aria-label={`Open ${project.name} link`}><ExternalLink size={16} /></a>}
                                        <button className="btn-text" onClick={() => setSelectedProject(project)}>Details</button>
                                        {isOwner && (
                                            <button className="link-icon" onClick={() => navigate(`/project/edit/${project.id}`)} title="Edit Project">
                                                <Settings size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ProjectPortfolio;
