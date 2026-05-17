import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Code, Play, Settings, CheckCircle, ExternalLink, Layers } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import { formatStaticUrl } from '../../utils/formatters';

const ProjectPortfolio = ({ projects, isOwner, setSelectedProject }) => {
    const navigate = useNavigate();

    return (
        <section className="dashboard-panel">
            <div className="panel-header between">
                <h2><Layers size={20} /> Projects Portfolio</h2>
                {isOwner && (
                    <Link to="/project/new" className="btn-add">
                        <Plus size={16} /> Add Project
                    </Link>
                )}
            </div>
            <div className="projects-grid-container">
                <div className="projects-grid">
                    {projects?.map(project => (
                        <div key={project.id} className="project-card">
                            <div className="project-thumb" onClick={() => setSelectedProject(project)}>
                                <SmartImage 
                                    src={formatStaticUrl(project.image_url)} 
                                    alt={project.name} 
                                    fallbackType="project"
                                />
                                {project.video_url && <div className="play-overlay"><Play size={24} fill="currentColor" /></div>}
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
