import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Award, BookOpen, Code2, CheckCircle2, HelpCircle, Loader2, Check, ExternalLink } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import './ProjectInfo.css';

// Extra rich details for standard projects
const PROJECT_EXTRA_DETAILS = {
    "Text-Based Adventure": {
        difficulty: "Beginner",
        concepts: ["Variables", "Loops", "Conditionals", "Input Handling"],
        goals: [
            "Create a branching story structure using if/else conditions.",
            "Understand user input loop control.",
            "Implement scoring or inventory tracking with variables."
        ]
    },
    "Practical Programming": {
        difficulty: "Intermediate",
        concepts: ["Real-world application", "Problem Solving", "Scripting"],
        goals: [
            "Identify a day-to-day problem that can be automated.",
            "Design and build a tool/script to address the problem.",
            "Refactor code to make it reusable."
        ]
    },
    "Dangerous Skies": {
        difficulty: "Beginner",
        concepts: ["For Loops", "While Loops", "Iteration", "Nesting"],
        goals: [
            "Build an obstacle course based on player performance.",
            "Combine for and while loops for game flow control.",
            "Master iterating through complex structures."
        ]
    },
    "Turtle Dragon": {
        difficulty: "Beginner",
        concepts: ["Objects", "Methods", "Arguments", "Creative Coding"],
        goals: [
            "Practice core programming syntax: instantiating objects.",
            "Design unique custom dragon behaviors.",
            "Pass parameters/arguments to custom functions."
        ]
    },
    "Simulation": {
        difficulty: "Advanced",
        concepts: ["Engineering Design Process", "Randomization", "Collaboration"],
        goals: [
            "Build a dynamic system simulation of your choice.",
            "Apply user testing feedback to improve the model.",
            "Incorporate randomized outcomes to mimic real-world complexity."
        ]
    },
    "bolt.new": {
        difficulty: "Intermediate",
        concepts: ["AI Prompting", "Full-Stack Deployment", "Rapid Prototyping"],
        goals: [
            "Use natural language prompts to model full-stack apps.",
            "Understand iterative deployment workflows.",
            "Deploy a live functional application."
        ]
    },
    "Tabula Rasa": {
        difficulty: "Intermediate",
        concepts: ["Coordinates", "Object Properties", "Victory Conditions"],
        goals: [
            "Program a grid game level from scratch.",
            "Set coordinates and properties for spawned entities.",
            "Define custom victory triggers."
        ]
    },
    "Gauntlet": {
        difficulty: "Intermediate",
        concepts: ["Movement Logic", "Timing", "Debugging"],
        goals: [
            "Refine character movement and collision detection.",
            "Time enemy spawns and environmental traps.",
            "Debug complex logical loops to ensure player survival."
        ]
    },
    "Game Dev 1 Final Project": {
        difficulty: "Intermediate",
        concepts: ["Game Grid", "Spawning", "Victory States"],
        goals: [
            "Create a playable CodeCombat level.",
            "Spawn enemies and configure coordinates.",
            "Build interactive goals."
        ]
    },
    "Story Maker": {
        difficulty: "Beginner",
        concepts: ["Event Handling", "Branching Narratives", "Conditionals"],
        goals: [
            "Capture player keyboard/mouse input.",
            "Design event listeners for branching stories.",
            "Practice conditional branching."
        ]
    },
    "Wanted Poster": {
        difficulty: "Beginner",
        concepts: ["Layout Positioning", "HTML/CSS Layouts", "Styling"],
        goals: [
            "Design a digital Wanted Poster graphic.",
            "Apply layout structure and grid positioning.",
            "Combine typography and color themes."
        ]
    },
    "Game Dev 2 Final Project": {
        difficulty: "Intermediate",
        concepts: ["Event Listeners", "Keyboard Control", "Physics Rules"],
        goals: [
            "Handle mouse and key listeners for game objects.",
            "Define basic physics and momentum parameters.",
            "Implement multi-button control bindings."
        ]
    },
    "Quizlet": {
        difficulty: "Intermediate",
        concepts: ["Arrays", "Dictionaries", "Score Tracking"],
        goals: [
            "Store paired question/answer sets in key-value maps.",
            "Verify text inputs against storage records.",
            "Implement scoring and level-complete calculations."
        ]
    },
    "Game Dev 3": {
        difficulty: "Advanced",
        concepts: ["State Management", "Enemy AI Pathfinding", "Functions"],
        goals: [
            "Create a complex game with multiple levels.",
            "Implement state patterns for game loops.",
            "Write custom AI movement behavior."
        ]
    },
    "Arcade Card or Board Game": {
        difficulty: "Advanced",
        concepts: ["OOP Principles", "Game Physics", "Flow Logic"],
        goals: [
            "Model card/board rules programmatically using classes.",
            "Code turn-based and phase-based game logic.",
            "Add visual effects for board state changes."
        ]
    },
    "Curiosity Sandbox": {
        difficulty: "Advanced",
        concepts: ["Loops & Variables", "Dynamic Art", "Experimental Logic"],
        goals: [
            "Build an open-ended artistic sandbox simulation.",
            "Utilize loops to generate particles and graphics.",
            "Encourage player interaction and modifications."
        ]
    },
    "Binary Search & Algorithms": {
        difficulty: "Advanced",
        concepts: ["Search Algorithms", "Sort Complexity", "Big O Notation"],
        goals: [
            "Implement binary search and bubble/quick sort.",
            "Understand execution speeds on large data arrays.",
            "Write tests to analyze algorithmic efficiency."
        ]
    },
    "Capstone Challenge": {
        difficulty: "Advanced",
        concepts: ["Full-Stack Architecture", "Algorithmic Puzzles", "Deployment"],
        goals: [
            "Construct a fully-realized custom software app.",
            "Solve complex algorithmic logic problems.",
            "Document code structure and project steps."
        ]
    },
    "Group Roblox Game": {
        difficulty: "Intermediate",
        concepts: ["Team Collaboration", "Roblox Lua Scripting", "3D Building"],
        goals: [
            "Collaborate as a team to construct a Roblox world.",
            "Use Lua scripting to bind elements to interactions.",
            "Learn coordination, versioning, and project management."
        ]
    },
    "Favorite Animal Page": {
        difficulty: "Beginner",
        concepts: ["HTML Tags", "Image Embedding", "Basic CSS"],
        goals: [
            "Learn core HTML elements (headings, paragraphs, images).",
            "Apply CSS font styles, borders, and margins.",
            "Publish a simple website showing facts about an animal."
        ]
    },
    "Profile Page": {
        difficulty: "Intermediate",
        concepts: ["Portfolio Design", "Responsive Layouts", "Media Queries"],
        goals: [
            "Build a responsive profile/portfolio page.",
            "Incorporate responsive layouts that work on mobile and desktop.",
            "Showcase course accomplishments, stats, and links."
        ]
    }
};

const DEFAULT_EXTRA = {
    difficulty: "Intermediate",
    concepts: ["Computer Science", "Coding Logic", "Problem Solving"],
    goals: [
        "Define project scope and flow.",
        "Implement basic variables and conditional structures.",
        "Submit final work to teacher for feedback."
    ]
};

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

    // Helpers to get static placeholder URL
    const getProjectPlaceholder = (name) => {
        if (!name) return '/static/images/Project_placeholder.png';
        const slug = name.toLowerCase()
            .replace(/ /g, '_')
            .replace(/\./g, '_')
            .replace(/&/g, '_')
            .replace(/-/g, '_');
        
        let cleanSlug = slug;
        while (cleanSlug.includes('__')) {
            cleanSlug = cleanSlug.replace(/__/g, '_');
        }
        cleanSlug = cleanSlug.replace(/(^_+|+$)/g, '');
        
        return `/static/images/project_templates/${cleanSlug}.png`;
    };

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
                toast.success(`Assigned "${project.name}" to your workspace!`);
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

    const extra = PROJECT_EXTRA_DETAILS[project.name] || DEFAULT_EXTRA;

    return (
        <div className="project-info-page animate-page-entry">
            <button className="btn-secondary mb-md" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} /> Back to Map
            </button>
            
            <div className="project-info-container">
                <div className="project-header-section">
                    <div className="project-header-main">
                        <img 
                            src={getProjectPlaceholder(project.name)} 
                            alt={project.name} 
                            className="project-header-cover-img"
                            onError={(e) => { e.target.src = '/static/images/Project_placeholder.png'; }}
                        />
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
                                {extra.goals.map((goal, idx) => (
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
                                    <span className="info-value">{extra.difficulty}</span>
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-icon-box">
                                    <Code2 size={20} />
                                </div>
                                <div className="info-text-box">
                                    <span className="info-label">Concepts Covered</span>
                                    <span className="info-value">{extra.concepts.join(', ')}</span>
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
