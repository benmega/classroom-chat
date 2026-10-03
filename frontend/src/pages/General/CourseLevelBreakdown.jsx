import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, Trophy, Play, Box } from 'lucide-react';
import client from '../../api/client';

import './CourseProgressTree.css';
import {
    ALIGNED_NODES, matchCourse, getDomainConfig, findProjectForLevel,
    findStudentProjectForTemplate, getStudentProjectStatus
} from '../../constants/courseProgress';

const COURSE_CONCEPTS = {
    'cc-junior': {
        concepts: ['Sequencing', 'Algorithms', 'Simple Loops', 'Problem Solving'],
        description: 'This course covers breaking down complex tasks into a sequence of instructions (algorithms) and repeating blocks of instructions using basic loops, establishing computational thinking patterns.',
        skills: ['Debugging errors', 'Ordering steps', 'Visual logic patterns']
    },
    'cs-1': {
        concepts: ['Syntax', 'Arguments', 'Strings', 'Variables', 'While Loops'],
        description: 'This course introduces writing lines of text-based code, supplying input values (arguments) to functions, and using basic loops to automate repetition, building coding syntax familiarity.',
        skills: ['Basic text commands', 'Code alignment', 'Logical pathways']
    },
    'oz-1': {
        concepts: ['Sequences', 'Variables', 'Debugging', 'Logical Flows'],
        description: 'This course explores variable declarations and memory storage while fixing broken program instructions (debugging) in a narrative-driven learning environment.',
        skills: ['Variable naming', 'Code reading', 'Identifying logic bugs']
    },
    'gd-1': {
        concepts: ['Event Handling', 'Game Mechanics', 'Custom Variables', 'UI Design'],
        description: 'This course covers programming games by binding custom code reactions to player inputs and events, including how collision triggers and victory conditions work.',
        skills: ['Defining event handlers', 'Designing playable levels', 'Game flow orchestration']
    },
    'cs-2': {
        concepts: ['Conditionals (If/Else)', 'Custom Functions', 'Boolean Logic', 'Parameters'],
        description: 'This course teaches how programs make decisions dynamically using logic tests (conditionals) and how to package code into reusable procedures (functions) with custom inputs.',
        skills: ['Decision trees', 'Function declarations', 'Boolean operators (AND/OR)']
    },
    'oz-2': {
        concepts: ['Conditionals', 'Iteration', 'Logical branches'],
        description: 'This course explores branching logical pathways to adapt to dynamic environments, deepening control flow mastery.',
        skills: ['Adaptive coding', 'Conditional structures', 'Pattern recognition']
    },
    'wd-1': {
        concepts: ['HTML5', 'CSS Styling', 'Web Layouts', 'Semantic Elements'],
        description: 'This course teaches how to build websites by structuring layout headers, paragraphs, and list components, and styling them using modern styling selectors.',
        skills: ['HTML tagging', 'CSS colors & fonts', 'Web design layouts']
    },
    'cs-3': {
        concepts: ['Arithmetic', 'Arrays & Lists', 'Nested Loops', 'Algorithmic Optimization'],
        description: 'This course explores complex collections of items (arrays) and nesting control structures (loops inside loops) to implement search and traversal algorithms.',
        skills: ['Index manipulation', 'Complex loop logic', 'Math computations in code']
    },
    'oz-3': {
        concepts: ['Functions', 'Nested Logic', 'Parameters', 'Return Values'],
        description: 'This course teaches advanced function orchestration, passing inputs as parameters and returning outputs from calculations to create clean code.',
        skills: ['Modular design', 'Parameter management', 'Data transformation']
    },
    'gd-2': {
        concepts: ['Collisions', 'Score Variables', 'Continuous Game Loops', 'Sound & Effects'],
        description: 'This course covers building multi-level games, programming physics collisions, handling player scores, and controlling animations and sound effects.',
        skills: ['Sprite sprite properties', 'Global variables', 'Physics collision detection']
    },
    'wd-2': {
        concepts: ['Interactivity', 'DOM Manipulation', 'CSS Flexbox/Grid', 'Responsive Layouts'],
        description: 'This course teaches how to style advanced responsive pages and build page interactivity, connecting frontend layout elements to script events.',
        skills: ['CSS Flexbox/Grid', 'Interactive UI widgets', 'Event handlers']
    },
    'cs-4': {
        concepts: ['Object-Oriented Programming', 'Classes', 'Methods', 'Advanced Arrays'],
        description: 'This course covers Object-Oriented Programming (OOP) fundamentals, defining custom object models (Classes) and behaviors (Methods) to structure large applications.',
        skills: ['Object instances', 'Encapsulation', 'Array sorting/filtering']
    },
    'oz-4': {
        concepts: ['Event Listeners', 'Asynchronous Code', 'Custom Animations'],
        description: 'This course covers constructing high-fidelity interactive projects, utilizing event listeners and asynchronous programming models to synchronize animation frames.',
        skills: ['Event-driven loops', 'Asynchronous flow control', 'Animation timelines']
    },
    'gd-3': {
        concepts: ['Autonomous AI', 'Custom User Interfaces', 'Game Balancing', 'State Machines'],
        description: 'This course covers creating complex unit AI systems and advanced head-up display HUDs, balancing gameplay rules and orchestrating multi-character state changes.',
        skills: ['Pathfinding logic', 'HUD dashboard layout', 'State machine design']
    },
    'cs-5': {
        concepts: ['Vectors', 'Coordinate Math', 'Game Physics', 'Complex AI Strategies'],
        description: 'This course covers utilizing vectors and mathematical equations to control autonomous agent behaviors, movement physics, and path coordinates.',
        skills: ['Vector math', 'Force calculations', 'Autonomous strategy rules']
    },
    'cs-6': {
        concepts: ['Big O Complexity', 'Sorting Algorithms', 'Data Structures', 'Searching Algorithms'],
        description: 'This course covers advanced computer science algorithms, measuring time/space efficiency (Big O), and building custom data storage pipelines.',
        skills: ['Binary trees', 'Complexity estimation', 'Algorithm comparison']
    },
    '3d-1': {
        concepts: ['3D Printing Basics', 'Shapes & Alignment', 'Holes (Subtraction)', 'Grouping', 'Measuring in mm', 'Revolve'],
        description: 'This course teaches 3D design in Tinkercad. You combine simple shapes, line them up exactly, cut holes with hole shapes, group parts together, size things in millimeters and spin shapes around an axis to build models you could really 3D print.',
        skills: ['Aligning and snapping shapes', 'Cutting holes with Boolean subtraction', 'Grouping parts into one object', 'Measuring and resizing in mm']
    },
    '3d-2': {
        concepts: ['Navigation', 'Mesh Modeling', 'Modifiers', 'Materials', 'Keyframe Animation'],
        description: 'This course moves up to Blender, a professional 3D program. You learn to move around the 3D view, shape meshes by editing their points and faces, use modifiers to speed up your work, add colors and materials, and bring your creations to life with keyframe animation.',
        skills: ['Navigating the 3D viewport', 'Editing meshes (vertices, edges, faces)', 'Using modifiers', 'Animating with keyframes']
    }
};

const getCourseDetails = (node) => {
    if (node.id && COURSE_CONCEPTS[node.id]) {
        return COURSE_CONCEPTS[node.id];
    }
    if (node.domain === '3d-modeling') {
        return {
            concepts: ['3D Design', 'Spatial Thinking', 'Problem Solving'],
            description: 'This course builds 3D modeling skills by turning ideas into models you design, check and share.',
            skills: ['Building models step by step', 'Measuring and aligning parts', 'Sharing your work']
        };
    }
    const isOz = node.domain === 'ozaria';
    return {
        concepts: isOz ? ['Logic Flow', 'Variables', 'Code Structures'] : ['Syntax', 'Loops', 'Computational Thinking'],
        description: `This course covers fundamental computer science principles, applying logical reasoning, structural coding, and step-by-step problem-solving techniques to design programs in ${isOz ? 'Ozaria' : 'CodeCombat'}.`,
        skills: ['Logical execution', 'Sequence planning', 'Debugging skills']
    };
};

const TRACK_NAMES = {
    ozaria: 'Ozaria',
    cs: 'Computer Science (CS)',
    gd: 'Game Development (GD)',
    wd: 'Web Development (WD)',
    '3d': '3D Modeling'
};

const CourseLevelBreakdown = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { slug } = useParams();
    const selectedNode = location.state?.selectedNode;

    const [userObj, setUserObj] = useState(location.state?.userObj || null);
    const [projects, setProjects] = useState([]);

    const is3D = selectedNode?.domain === '3d-modeling';
    const nodeConfig = ALIGNED_NODES.find(n => n.id === selectedNode?.id);
    const nodeAliases = selectedNode?.aliases || nodeConfig?.aliases || (selectedNode?.title ? [selectedNode.title] : []);
    const nodeAliasKey = nodeAliases.join('|');

    // The 3D section needs the student's own projects (status + "Continue project"), which the
    // full profile carries. Fetch the profile when we have no user at all, or (3D only) when the
    // user passed through navigation state has no projects list. Only ever fetched once.
    const profileRequested = useRef(false);
    useEffect(() => {
        const needsProfile = !userObj || (is3D && !Array.isArray(userObj.projects));
        if (!needsProfile || !slug || profileRequested.current) return;
        profileRequested.current = true;
        client.get(`/user/profile/${slug}`)
            .then(res => {
                const target = res.data?.data?.target;
                if (target) {
                    setUserObj(prev => ({ ...(prev || {}), ...target }));
                }
            })
            .catch(() => {});
    }, [slug, userObj, is3D]);

    // 3D Modeling is mini-project based: each challenge has one project template whose
    // `chapter` is this course's name (same lookup the progress tree uses).
    useEffect(() => {
        if (!is3D) return undefined;
        let cancelled = false;
        client.get('/api/project-templates')
            .then(res => {
                if (cancelled) return;
                const templates = Object.values(res.data?.data?.templates || {});
                const aliases = nodeAliasKey.split('|');
                setProjects(templates.filter(t => t.chapter && matchCourse(t.chapter, aliases)));
            })
            .catch(err => console.error('Failed to fetch project templates', err));
        return () => { cancelled = true; };
    }, [is3D, nodeAliasKey]);

    if (!selectedNode) {
        return (
            <div className="course-progress-container p-2rem">
                <button className="back-button mb-2rem" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <h2>Course data not found</h2>
                <p>Please go back and select a valid course.</p>
            </div>
        );
    }

    const domainConfig = getDomainConfig(selectedNode.domain);
    const isParent = location.pathname.startsWith('/parent');
    const mainGameLink = domainConfig.playUrl;
    const trackName = TRACK_NAMES[selectedNode.track];

    // Which external tool(s) to offer for a 3D course: this course's tool, else every 3D tool.
    const toolName = selectedNode.toolName || nodeConfig?.toolName;
    const toolUrl = selectedNode.toolUrl || nodeConfig?.toolUrl;
    const tools = toolUrl ? [{ id: toolName, name: toolName, url: toolUrl }] : (domainConfig.tools || []);

    const openProject = (project) => navigate(`/project-info/${project.id}`, { state: { project } });

    const levels = selectedNode.levels || [];
    const nextLevelIndex = levels.findIndex(lvl => !lvl.is_completed);
    const nextLevel = nextLevelIndex !== -1 ? levels[nextLevelIndex] : null;
    const completedLevelsCount = selectedNode.levels_completed || 0;
    const totalLevelsCount = selectedNode.levels_total || levels.length || 0;
    const progressPercent = totalLevelsCount > 0 
        ? Math.min(Math.round((completedLevelsCount / totalLevelsCount) * 100), 100) 
        : 0;

    const courseDetails = getCourseDetails(selectedNode);

    // Syllabus rows. For 3D each level is paired with its project; any project without a
    // matching level is still listed so the student can find it.
    const syllabusRows = levels.map(lvl => ({ ...lvl, project: is3D ? findProjectForLevel(lvl, projects) : null }));
    if (is3D) {
        projects.forEach(project => {
            if (!syllabusRows.some(row => row.project?.id === project.id)) {
                syllabusRows.push({ name: project.name, is_completed: false, project });
            }
        });
    }
    const nextProject = is3D && nextLevel ? findProjectForLevel(nextLevel, projects) : null;

    // The student's own project for a template (null when not started) and its status label.
    const studentProjects = userObj?.projects;
    const ownProjectFor = (template) => (is3D ? findStudentProjectForTemplate(template, studentProjects) : null);
    const nextOwnProject = ownProjectFor(nextProject);
    const openOwnProject = (ownProject) => navigate(`/project/edit/${ownProject.id}`);


    return (
        <div className="course-progress-container breakdown-page-wrapper p-2rem">
            <button className="back-button mb-2rem cursor-pointer" onClick={() => navigate(-1)}>
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            <div className={`breakdown-header-card glass-panel mb-2rem p-2rem d-flex justify-between align-center flex-wrap gap-lg border-l-thick border-${domainConfig.cssClass}`}>
                <div className="d-flex align-center gap-md">
                    <div className="domain-badge-wrapper flex-shrink-0">
                        <img
                            src={selectedNode.logo || nodeConfig?.logo || domainConfig.logo}
                            alt={toolName || domainConfig.label}
                            className="breakdown-logo-img"
                        />
                    </div>
                    <div>
                        <h1 className="text-primary mt-4px mb-4px">{selectedNode.title}</h1>
                        {trackName && <span className="text-secondary text-sm">{trackName}</span>}
                    </div>
                </div>
                <div className="breakdown-progress-summary text-right">
                    <span className="text-2rem font-bold text-primary">{progressPercent}%</span>
                    <span className="text-secondary text-sm d-block">{completedLevelsCount}/{totalLevelsCount} Completed</span>
                    <div className="course-progress-bar h-12px w-200px mt-0-5rem bg-surface-sec radius-full overflow-hidden">
                        <div
                            className="course-progress-fill h-100"
                            style={{
                                width: `${progressPercent}%`,
                                background: domainConfig.color
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="breakdown-dashboard-grid d-flex gap-lg flex-wrap">

                <div className="dashboard-column flex-1 d-flex flex-col gap-lg min-w-300px">

                    <div className="glass-panel p-1-5rem d-flex flex-col gap-md pos-rel overflow-hidden border-top-glow">
                        <h3 className="m-0 text-primary d-flex align-center gap-sm">
                            <span>{is3D ? 'Next Project' : 'Next Level'}</span>
                        </h3>

                        {nextLevel ? (
                            <div
                                className="next-level-card-content p-1rem bg-surface-sec radius-md d-flex flex-col gap-sm"
                                style={{
                                    borderLeft: `4px solid ${domainConfig.color}`,
                                }}
                            >
                                <span className="font-semibold text-primary text-md">{nextLevel.name}</span>
                                <span className="text-secondary text-xs">{is3D ? 'Project' : 'Level'} {nextLevelIndex + 1} of {levels.length}</span>
                            </div>
                        ) : (
                            <div className="text-center p-1-5rem bg-success-subtle radius-md border-success" style={{ borderColor: '#10b981' }}>
                                <Trophy className="text-success mb-0-5rem" size={32} />
                                <h4 className="m-0 text-success font-bold">{is3D && totalLevelsCount === 0 ? 'Projects coming soon' : '100% Done'}</h4>
                            </div>
                        )}

                        {is3D ? (
                            !isParent && (
                                <>
                                    <p className="text-secondary text-sm line-height-relaxed m-0">
                                        Build it, share your link + screenshot, and your teacher will check it off.
                                    </p>
                                    {nextProject && (
                                        <button
                                            type="button"
                                            className="btn-play-game d-flex align-center justify-center gap-sm p-1rem font-bold text-center radius-md cursor-pointer border-none btn-modeling3d"
                                            onClick={() => (nextOwnProject ? openOwnProject(nextOwnProject) : openProject(nextProject))}
                                        >
                                            <Box size={18} aria-hidden="true" />
                                            <span>{nextOwnProject ? 'Continue project' : 'Start project'}</span>
                                        </button>
                                    )}
                                    {tools.map(tool => (
                                        <a
                                            key={tool.id}
                                            href={tool.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-play-game btn-modeling3d-outline d-flex align-center justify-center gap-sm p-1rem font-bold text-center radius-md cursor-pointer no-decoration"
                                        >
                                            <span>Open {tool.name}</span>
                                            <ExternalLink size={16} aria-hidden="true" />
                                            <span className="cpt-sr-only">(opens in new tab)</span>
                                        </a>
                                    ))}
                                </>
                            )
                        ) : (
                            <a
                                href={mainGameLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`btn-play-game d-flex align-center justify-center gap-sm p-1rem font-bold text-center radius-md cursor-pointer border-none no-decoration btn-${domainConfig.cssClass}`}
                                style={{
                                    color: '#ffffff',
                                    backgroundColor: domainConfig.color,
                                    transition: 'background-color 0.2s, transform 0.2s',
                                }}
                                onFocus={() => {}} onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = domainConfig.colorHover;
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onBlur={() => {}} onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = domainConfig.color;
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <Play size={18} fill="currentColor" />
                                <span>Continue</span>
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                </div>

                <div className="dashboard-column flex-1 d-flex flex-col gap-lg min-w-300px">
                    <div className="glass-panel p-1-5rem h-100 d-flex flex-col gap-lg justify-between">
                        <div className="d-flex flex-col gap-md">

                            <div>
                                <h4 className="text-sm font-bold text-primary mb-0-25rem">Summary</h4>
                                <p className="text-secondary text-sm line-height-relaxed m-0">
                                    {courseDetails.description}
                                </p>
                            </div>

                            <div>
                                <div className="d-flex flex-wrap" style={{ gap: '12px' }}>
                                    {courseDetails.concepts.map((concept, idx) => (
                                        <span
                                            key={idx}
                                            className="badge-concept text-xs px-10px py-6px radius-full font-semibold"
                                            style={{
                                                background: domainConfig.tint,
                                                color: domainConfig.textColor,
                                                border: `1px solid ${domainConfig.tintBorder}`,
                                            }}
                                        >
                                            {concept}
                                        </span>
                                    ))}
                                </div>
                            </div>

                        </div>

                        <div>
                            <h4 className="text-xs uppercase tracking-wide text-secondary mb-0-5rem d-flex align-center gap-xs">
                                <span>Skills</span>
                            </h4>
                            <ul className="skills-checklist m-0 text-sm text-secondary">
                                {courseDetails.skills.map((skill, idx) => (
                                    <li key={idx} className="mb-4px">{skill}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

            </div>

            <div className="glass-panel p-2rem mt-2rem">
                <h3 className="mb-1rem text-primary d-flex align-center gap-sm">
                    <span>{is3D ? 'Projects' : 'Syllabus'}</span>
                </h3>
                <div className="levels-grid-checklist d-flex flex-col gap-sm mt-1-5rem">
                    {syllabusRows.length > 0 ? (
                        syllabusRows.map((lvl, index) => {
                            const ownProject = ownProjectFor(lvl.project);
                            const status = getStudentProjectStatus(ownProject);
                            const actionLabel = lvl.is_completed ? 'View project' : (ownProject ? 'Continue project' : 'Start project');
                            return (
                            <div
                                key={index}
                                className={`level-row-item d-flex justify-between align-center flex-wrap gap-sm p-1rem bg-surface-sec radius-md border-subtle ${lvl.is_completed ? 'status-completed' : 'status-pending'}`}
                                style={{
                                    borderLeft: lvl.is_completed
                                        ? '4px solid #10b981'
                                        : `4px solid ${domainConfig.color}`,
                                    opacity: lvl.is_completed ? 1 : 0.85
                                }}
                            >
                                <div className="d-flex align-center gap-md">
                                    <div
                                        className={`level-status-dot d-flex align-center justify-center radius-full`}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: lvl.is_completed ? '#10b981' : '#e5e7eb',
                                            color: lvl.is_completed ? '#ffffff' : '#4b5563',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {lvl.is_completed ? <Check size={14} /> : <span className="text-xs font-bold">{index + 1}</span>}
                                    </div>
                                    <span className="font-semibold text-primary text-md">{lvl.name}</span>
                                </div>
                                <div className="d-flex align-center gap-sm">
                                    {lvl.is_completed ? (
                                        <span
                                            className="text-success text-xs font-bold uppercase tracking-wider px-8px py-4px radius-sm"
                                            style={{
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            Done
                                        </span>
                                    ) : (
                                        <span
                                            className="text-secondary text-xs font-bold uppercase tracking-wider px-8px py-4px radius-sm"
                                            style={{
                                                backgroundColor: 'rgba(156, 163, 175, 0.1)',
                                                color: 'var(--text-secondary)',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            {is3D ? status.label : 'Pending'}
                                        </span>
                                    )}
                                    {lvl.project && !isParent && (
                                        <button
                                            type="button"
                                            className={`btn-project-action ${lvl.is_completed ? 'secondary' : ''}`}
                                            onClick={() => (!lvl.is_completed && ownProject ? openOwnProject(ownProject) : openProject(lvl.project))}
                                            aria-label={`${actionLabel}: ${lvl.project.name}`}
                                        >
                                            {actionLabel}
                                        </button>
                                    )}
                                </div>
                            </div>
                            );
                        })
                    ) : (
                        <p className="text-muted text-center p-2rem bg-surface-sec radius-md w-100">
                            {is3D ? 'Projects coming soon' : 'Empty'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseLevelBreakdown;
