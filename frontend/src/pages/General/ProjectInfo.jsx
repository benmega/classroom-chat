import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Code2, CheckCircle2, HelpCircle, Loader2, Check, ExternalLink } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import { formatStaticUrl } from '../../utils/formatters';
import './ProjectInfo.css';



const ProjectInfo = () => {
    const { projectId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    
    const [project, setProject] = useState(state?.project || null);
    const [assignedProject, setAssignedProject] = useState(null);
    const [loading, setLoading] = useState(!project);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState(null);


    useEffect(() => {
        const loadDetails = async () => {
            setLoading(true);
            try {
                let currentProj = project;
                
                // Fetch template if not passed in navigation state
                if (!currentProj) {
                    const res = await client.get('/api/project-templates');
                    const templates = res.data?.data?.templates || {};
                    const found = Object.values(templates).find(t => String(t.id) === String(projectId));
                    if (found) {
                        currentProj = found;
                        setProject(found);
                    } else {
                        setError('Project template not found.');
                        setLoading(false);
                        return;
                    }
                }
                
                // Check if current user already has this project assigned
                if (user && currentProj) {
                    const profileRes = await client.get('/user/profile');
                    const userProfile = profileRes.data?.data?.target;
                    if (userProfile && userProfile.projects) {
                        const assigned = userProfile.projects.find(p => p.name === currentProj.name);
                        if (assigned) {
                            setAssignedProject(assigned);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching project templates/profile:', err);
                setError('Failed to load project details.');
            } finally {
                setLoading(false);
            }
        };
        
        loadDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, user]);

    const handleAssign = async () => {
        if (!project || !user) return;
        setAssigning(true);
        
        const formData = new FormData();
        formData.append('name', project.name);
        formData.append('description', project.description || '');
        formData.append('student_id', user.id);
        
        try {
            const response = await client.post('/user/project/new', formData);
            if (response.data.status === 'success') {
                
                // Reload profile data to find newly assigned project
                const profileRes = await client.get('/user/profile');
                const userProfile = profileRes.data?.data?.target;
                if (userProfile && userProfile.projects) {
                    const assigned = userProfile.projects.find(p => p.name === project.name);
                    if (assigned) {
                        setAssignedProject(assigned);
                    }
                }
            } else {
                toast.error(response.data.error || 'Failed to assign project.');
            }
        } catch (err) {
            console.error('Assign project error:', err);
            toast.error(err.response?.data?.error || 'An error occurred during assignment.');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) {
        return (
            <div className="project-info-page animate-page-entry">
                <div className="project-info-container project-loading-container">
                    <Loader2 size={40} className="animate-spin text-primary" />
                    <p>Loading project details...</p>
                </div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="project-info-page animate-page-entry">
                <div className="project-info-container project-not-found">
                    <h2>Oops!</h2>
                    <p>{error || 'Project template not found.'}</p>
                    <button className="btn-secondary mt-md" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const difficulty = project.difficulty || "Intermediate";
    const concepts = Array.isArray(project.concepts) ? project.concepts : [];
    const goals = Array.isArray(project.goals) ? project.goals : [];

    return (
        <div className="project-info-page animate-page-entry">
            <button className="btn-secondary mb-md" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} /> Back to Map
            </button>
            
            <div className="project-info-container">
                <div className="project-header-section">
                    <div className="project-header-main">
                        <div 
                            className="project-header-cover-img"
                            style={{ 
                                backgroundImage: project.image_url ? `url(${formatStaticUrl(project.image_url)})` : 'none',
                                backgroundColor: project.image_url ? 'transparent' : 'var(--blue-600)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {!project.image_url && <BookOpen size={64} />}
                        </div>
                        <h1 className="project-title">{project.name}</h1>
                    </div>
                </div>

                <div className="project-hero">
                    {/* Left side: Main Content */}
                    <div className="project-main-content">
                        <div className="project-description-section">
                            <h3 className="project-section-title">
                                <BookOpen size={20} /> Project Overview
                            </h3>
                            <div className="project-description-card">
                                <p>{project.description || "No description provided."}</p>
                            </div>
                        </div>

                        <div className="learning-goals-card">
                            <h3 className="project-section-title">
                                <CheckCircle2 size={20} /> What You Will Learn
                            </h3>
                            <ul className="goals-list">
                                {goals.map((goal, idx) => (
                                    <li key={idx} className="goal-item">
                                        <CheckCircle2 size={16} className="goal-check-icon" />
                                        <span>{goal}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right side: Sidebar Actions & Specs */}
                    <div className="project-sidebar-content">
                        {/* Assignment Action Card */}
                        <div className="action-card">
                            {assignedProject ? (
                                <div className="action-btn-wrapper">
                                    <Link to={`/project/edit/${assignedProject.id}`} className="btn-premium">
                                        Manage Project <ExternalLink size={16} />
                                    </Link>
                                </div>
                            ) : (
                                <div className="action-btn-wrapper">
                                    <button 
                                        className="btn-premium" 
                                        onClick={handleAssign}
                                        disabled={assigning}
                                    >
                                        {assigning ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" /> Assigning...
                                            </>
                                        ) : (
                                            'Assign to me'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Metadata Specs Card */}
                        <div className="info-grid-card">
                            <div className="info-item">
                                <div className="info-icon-box">
                                    <Award size={20} />
                                </div>
                                <div className="info-text-box">
                                    <span className="info-label">Difficulty</span>
                                    <span className="info-value">{difficulty}</span>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon-box">
                                    <Code2 size={20} />
                                </div>
                                <div className="info-text-box">
                                    <span className="info-label">Concepts Covered</span>
                                    <span className="info-value">{concepts.join(', ')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectInfo;
