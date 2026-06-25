import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Code, Play, Settings, CheckCircle, ExternalLink, Layers, Clock } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import { formatStaticUrl } from '../../utils/formatters';

const ProjectPortfolio = ({ projects, isOwner, setSelectedProject }) => {
    const navigate = useNavigate();

    const sortedProjects = projects ? [...projects].sort((a, b) => b.id - a.id) : [];

    return (
        <section className="dashboard-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2><Layers size={20} /> Projects Portfolio</h2>
                {isOwner && (
                    <Link to="/project/new" title="Add Project" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <Plus size={20} />
                    </Link>
                )}
            </div>
            <div className="projects-grid-container">
                <div className="projects-grid">
                    {sortedProjects.map(project => (
                        <div key={project.id} className="project-card">
                            <div className="project-thumb" onClick={() => setSelectedProject(project)}>
                                <SmartImage 
                                    src={formatStaticUrl(project.image_url)} 
                                    alt={project.name} 
                                    fallbackType="project"
                                />
                                {project.video_url && <div className="play-overlay"><Play size={24} fill="currentColor" /></div>}
                                {!project.teacher_comment && (
                                    <span className="in-progress-badge" title="Pending Admin Approval">
                                        <Clock size={12} /> In Progress
                                    </span>
                                )}
                            </div>
                            <div className="project-content">
                                <h3>{project.name}</h3>
                                
                                {project.teacher_comment && (
                                    <div className="card-teacher-feedback">
                                        <CheckCircle size={14} /> {project.teacher_comment.substring(0, 80)}...
                                    </div>
                                )}

                                <p>{project.description?.substring(0, 80)}...</p>
                                <div className="project-footer">
                                    {project.link && <a href={project.link} target="_blank" rel="noreferrer" className="link-icon"><ExternalLink size={16} /></a>}
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
            </div>
        </section>
    );
};

export default ProjectPortfolio;
