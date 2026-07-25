import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, Brain, GraduationCap, Trophy, Play, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './CourseProgressTree.css';
import codecombatLogo from '../../assets/codecombat-logo.png';
import ozariaLogo from '../../assets/ozaria-logo.png';

// Extensive educational concepts and descriptions dictionary for parents
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
    }
};

const getCourseDetails = (node) => {
    if (node.id && COURSE_CONCEPTS[node.id]) {
        return COURSE_CONCEPTS[node.id];
    }
    // Default fallback based on domain/name
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
    wd: 'Web Development (WD)'
};

const CourseLevelBreakdown = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { slug } = useParams();
    const selectedNode = location.state?.selectedNode;

    const [userObj, setUserObj] = useState(location.state?.userObj || null);
    const [localPendingRequest, setLocalPendingRequest] = useState(null);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!userObj && slug) {
            client.get(`/user/profile/${slug}`)
                .then(res => {
                    const target = res.data?.data?.target;
                    if (target) {
                        setUserObj(target);
                    }
                })
                .catch(() => {});
        }
    }, [slug, userObj]);

    const activeTrack = userObj?.active_track || location.state?.activeTrack || 'cs';
    const pendingRequest = localPendingRequest || userObj?.pending_request || location.state?.pendingRequest;

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingRequest(true);
        try {
            const response = await client.post('/api/track-requests/', {
                requester_type: 'student',
                requested_track: selectedNode.track
            });
            if (response.data.success) {
                toast.success("Track change request submitted to your teacher!");
                setIsModalOpen(false);
                setLocalPendingRequest({ requested_track: selectedNode.track });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit request.");
        } finally {
            setIsSubmittingRequest(false);
        }
    };

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

    const isCodeCombat = selectedNode.domain === 'codecombat';
    const gameBaseUrl = isCodeCombat ? 'https://codecombat.com' : 'https://ozaria.com';
    const mainGameLink = `${gameBaseUrl}/play`;
    
    // Parse level completion status
    const levels = selectedNode.levels || [];
    const nextLevelIndex = levels.findIndex(lvl => !lvl.is_completed);
    const nextLevel = nextLevelIndex !== -1 ? levels[nextLevelIndex] : null;
    const completedLevelsCount = selectedNode.levels_completed || 0;
    const totalLevelsCount = selectedNode.levels_total || levels.length || 0;
    const progressPercent = totalLevelsCount > 0 
        ? Math.min(Math.round((completedLevelsCount / totalLevelsCount) * 100), 100) 
        : 0;

    const courseDetails = getCourseDetails(selectedNode);



    return (
        <div className="course-progress-container breakdown-page-wrapper p-2rem">
            <button className="back-button mb-2rem cursor-pointer" onClick={() => navigate(-1)}>
                <ArrowLeft size={20} />
                <span>Back</span>
            </button>

            {/* Header Course Card */}
            <div className={`breakdown-header-card glass-panel mb-2rem p-2rem d-flex justify-between align-center flex-wrap gap-lg border-l-thick border-${selectedNode.domain}`}>
                <div className="d-flex align-center gap-md">
                    <div className="domain-badge-wrapper flex-shrink-0">
                        <img 
                            src={isCodeCombat ? codecombatLogo : ozariaLogo} 
                            alt={selectedNode.domain} 
                            className="breakdown-logo-img"
                        />
                    </div>
                    <div>
                        <h1 className="text-primary mt-4px mb-4px">{selectedNode.title}</h1>
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
                                background: isCodeCombat ? '#2b91af' : '#902edb' 
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Main Redesigned Dashboard Grid */}
            <div className="breakdown-dashboard-grid d-flex gap-lg flex-wrap">
                
                {/* COLUMN 1: Student Play & Missed Levels Zone */}
                <div className="dashboard-column flex-1 d-flex flex-col gap-lg min-w-300px">
                    
                    {/* Merged Play/Next Level Card */}
                    <div className="glass-panel p-1-5rem d-flex flex-col gap-md pos-rel overflow-hidden border-top-glow">
                        {selectedNode.track === activeTrack ? (
                            <>
                                <h3 className="m-0 text-primary d-flex align-center gap-sm">
                                    <span>Next Level</span>
                                </h3>
                                
                                {nextLevel ? (
                                    <div 
                                        className="next-level-card-content p-1rem bg-surface-sec radius-md d-flex flex-col gap-sm"
                                        style={{
                                            borderLeft: isCodeCombat ? '4px solid #2b91af' : '4px solid #902edb',
                                        }}
                                    >
                                        <span className="font-semibold text-primary text-md">{nextLevel.name}</span>
                                        <span className="text-secondary text-xs">Level {nextLevelIndex + 1} of {levels.length}</span>
                                    </div>
                                ) : (
                                    <div className="text-center p-1-5rem bg-success-subtle radius-md border-success" style={{ borderColor: '#10b981' }}>
                                        <Trophy className="text-success mb-0-5rem" size={32} />
                                        <h4 className="m-0 text-success font-bold">100% Done</h4>
                                    </div>
                                )}

                                <a 
                                    href={mainGameLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={`btn-play-game d-flex align-center justify-center gap-sm p-1rem font-bold text-center radius-md cursor-pointer border-none no-decoration btn-${selectedNode.domain}`}
                                    style={{
                                        color: '#ffffff',
                                        backgroundColor: isCodeCombat ? '#2b91af' : '#902edb',
                                        transition: 'background-color 0.2s, transform 0.2s',
                                    }}
                                    onFocus={() => {}} onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = isCodeCombat ? '#217088' : '#7122ad';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }}
                                    onBlur={() => {}} onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = isCodeCombat ? '#2b91af' : '#902edb';
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <Play size={18} fill="currentColor" />
                                    <span>Continue</span>
                                    <ExternalLink size={16} />
                                </a>
                            </>
                        ) : (
                            <>
                                <h3 className="m-0 text-primary d-flex align-center gap-sm">
                                    <span>Get Started Now</span>
                                </h3>
                                <p className="text-secondary text-sm m-0">
                                    Request access to this track to unlock the curriculum and start coding!
                                </p>
                                {pendingRequest && pendingRequest.requested_track === selectedNode.track ? (
                                    <button
                                        disabled
                                        className="d-flex align-center justify-center gap-sm p-1rem font-bold text-center radius-md border-none"
                                        style={{
                                            color: '#ffffff',
                                            backgroundColor: '#9ca3af',
                                            cursor: 'not-allowed',
                                            width: '100%'
                                        }}
                                    >
                                        <span>Request Pending</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className={`btn-play-game d-flex align-center justify-center gap-sm p-1rem font-bold text-center radius-md cursor-pointer border-none btn-${selectedNode.domain}`}
                                        style={{
                                            color: '#ffffff',
                                            backgroundColor: isCodeCombat ? '#2b91af' : '#902edb',
                                            transition: 'background-color 0.2s, transform 0.2s',
                                            width: '100%'
                                        }}
                                        onFocus={() => {}} onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = isCodeCombat ? '#217088' : '#7122ad';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onBlur={() => {}} onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = isCodeCombat ? '#2b91af' : '#902edb';
                                            e.currentTarget.style.transform = 'none';
                                        }}
                                    >
                                        <span>Request Access</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* COLUMN 2: Parents Insights Zone */}
                <div className="dashboard-column flex-1 d-flex flex-col gap-lg min-w-300px">
                    <div className="glass-panel p-1-5rem h-100 d-flex flex-col gap-lg justify-between">
                        <div className="d-flex flex-col gap-md">

                            {/* Friendly Concept Explanation */}
                            <div>
                                <h4 className="text-sm font-bold text-primary mb-0-25rem">Summary</h4>
                                <p className="text-secondary text-sm line-height-relaxed m-0">
                                    {courseDetails.description}
                                </p>
                            </div>

                            {/* Concept Badges */}
                            <div>
                                <div className="d-flex flex-wrap" style={{ gap: '12px' }}>
                                    {courseDetails.concepts.map((concept, idx) => (
                                        <span 
                                            key={idx} 
                                            className="badge-concept text-xs px-10px py-6px radius-full font-semibold"
                                            style={{
                                                background: isCodeCombat ? 'rgba(43, 145, 175, 0.12)' : 'rgba(144, 46, 219, 0.12)',
                                                color: isCodeCombat ? '#2b91af' : '#902edb',
                                                border: isCodeCombat ? '1px solid rgba(43, 145, 175, 0.2)' : '1px solid rgba(144, 46, 219, 0.2)',
                                            }}
                                        >
                                            {concept}
                                        </span>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Cognitive Skills List */}
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

            {/* Full Levels Checklist */}
            <div className="glass-panel p-2rem mt-2rem">
                <h3 className="mb-1rem text-primary d-flex align-center gap-sm">
                    <span>Syllabus</span>
                </h3>
                <div className="levels-grid-checklist d-flex flex-col gap-sm mt-1-5rem">
                    {levels.length > 0 ? (
                        levels.map((lvl, index) => (
                            <div 
                                key={index} 
                                className={`level-row-item d-flex justify-between align-center p-1rem bg-surface-sec radius-md border-subtle ${lvl.is_completed ? 'status-completed' : 'status-pending'}`}
                                style={{
                                    borderLeft: lvl.is_completed 
                                        ? '4px solid #10b981' 
                                        : `4px solid ${isCodeCombat ? '#2b91af' : '#902edb'}`,
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
                                <div>
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
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted text-center p-2rem bg-surface-sec radius-md w-100">
                            Empty
                        </p>
                    )}
                </div>
            </div>
            {isModalOpen && (
                <div role="button" tabIndex={0} className="modal-backdrop" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsModalOpen(false)}>
                    <div role="button" tabIndex={0} className="modal-card glass-panel" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Request Track Access</h3>
                        </div>
                        <form onSubmit={handleRequestSubmit}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                                    Are you sure you want to request access to the <strong>{TRACK_NAMES[selectedNode.track] || selectedNode.track}</strong> track?
                                </p>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmittingRequest}>
                                    {isSubmittingRequest ? 'Submitting...' : 'Confirm Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseLevelBreakdown;
