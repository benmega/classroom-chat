import React, { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import codecombatLogo from '../../assets/codecombat-logo.png';
import ozariaLogo from '../../assets/ozaria-logo.png';
import './CourseProgressTree.css';

const TRACKS = [
    { id: 'ozaria', title: 'Ozaria', col: 1 },
    { id: 'cs', title: 'Computer Science', col: 2 },
    { id: 'gd', title: 'Game Development', col: 3 },
    { id: 'wd', title: 'Web Development', col: 4 }
];

const ALIGNED_NODES = [
  { id: 'cc-junior', title: 'Code Combat Junior', aliases: ['Code Combat Junior', 'Junior'], domain: 'codecombat', track: 'cs', row: 1 },
  { id: 'cs-1', title: 'Introduction to Computer Science', aliases: ['Introduction to Computer Science', 'Computer Science 1', 'CS1'], domain: 'codecombat', track: 'cs', row: 2 },
  { id: 'oz-1', title: 'Sky Mountain', aliases: ['Sky Mountain', 'Ozaria 1', 'Chapter1', 'Chapter 1'], domain: 'ozaria', track: 'ozaria', row: 3 },
  { id: 'gd-1', title: 'Game Development 1', aliases: ['Game Development 1', 'GD1'], domain: 'codecombat', track: 'gd', row: 3 },
  { id: 'cs-2', title: 'Computer Science 2', aliases: ['Computer Science 2', 'CS2'], domain: 'codecombat', track: 'cs', row: 4 },
  { id: 'oz-2', title: 'Ozaria Chapter 2', aliases: ['Ozaria Chapter 2', 'Chapter 2', 'Ozaria 2', 'Chapter2'], domain: 'ozaria', track: 'ozaria', row: 5 },
  { id: 'wd-1', title: 'Web Development 1', aliases: ['Web Development 1', 'WD1'], domain: 'codecombat', track: 'wd', row: 5 },
  { id: 'cs-3', title: 'Computer Science 3', aliases: ['Computer Science 3', 'CS3'], domain: 'codecombat', track: 'cs', row: 6 },
  { id: 'oz-3', title: 'Ozaria Chapter 3', aliases: ['Ozaria Chapter 3', 'Chapter 3', 'Ozaria 3', 'Chapter3'], domain: 'ozaria', track: 'ozaria', row: 7 },
  { id: 'gd-2', title: 'Game Development 2', aliases: ['Game Development 2', 'GD2'], domain: 'codecombat', track: 'gd', row: 7 },
  { id: 'wd-2', title: 'Web Development 2', aliases: ['Web Development 2', 'WD2'], domain: 'codecombat', track: 'wd', row: 7 },
  { id: 'cs-4', title: 'Computer Science 4', aliases: ['Computer Science 4', 'CS4'], domain: 'codecombat', track: 'cs', row: 8 },
  { id: 'oz-4', title: 'Ozaria 4', aliases: ['Ozaria 4', 'Ozaria Chapter 4', 'Chapter 4', 'Chapter4'], domain: 'ozaria', track: 'ozaria', row: 9 },
  { id: 'gd-3', title: 'Game Development 3', aliases: ['Game Development 3', 'GD3'], domain: 'codecombat', track: 'gd', row: 9 },
  { id: 'cs-5', title: 'Computer Science 5', aliases: ['Computer Science 5', 'CS5'], domain: 'codecombat', track: 'cs', row: 10 },
  { id: 'cs-6', title: 'Computer Science 6', aliases: ['Computer Science 6', 'CS6'], domain: 'codecombat', track: 'cs', row: 11 },
];

const BRANCH_EDGES = [
  { from: 'cs-1', to: 'gd-1' },
  { from: 'cs-2', to: 'wd-1' },
  { from: 'cs-3', to: 'gd-2' },
  { from: 'cs-3', to: 'wd-2' },
  { from: 'cs-4', to: 'gd-3' },
  { from: 'cs-1', to: 'oz-1' },
  { from: 'cs-2', to: 'oz-2' },
  { from: 'cs-3', to: 'oz-3' },
  { from: 'cs-4', to: 'oz-4' }
];

const matchCourse = (courseName, aliases) => {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = normalize(courseName);
    return aliases.some(alias => normalize(alias) === normName);
};

const getAncestors = (nodeId, processedNodes) => {
    const ancestors = new Set([nodeId]);
    let added = true;
    while (added) {
        added = false;
        TRACKS.forEach(track => {
            const trackNodes = processedNodes.filter(n => n.track === track.id && !n.is_extra);
            for (let i = 0; i < trackNodes.length - 1; i++) {
                if (ancestors.has(trackNodes[i + 1].id) && !ancestors.has(trackNodes[i].id)) {
                    ancestors.add(trackNodes[i].id); added = true;
                }
            }
        });
        BRANCH_EDGES.forEach(edge => {
            if (ancestors.has(edge.to) && !ancestors.has(edge.from)) {
                ancestors.add(edge.from); added = true;
            }
        });
    }
    return ancestors;
};

const getDescendants = (nodeId, processedNodes) => {
    const descendants = new Set([nodeId]);
    let added = true;
    while (added) {
        added = false;
        TRACKS.forEach(track => {
            const trackNodes = processedNodes.filter(n => n.track === track.id && !n.is_extra);
            for (let i = 0; i < trackNodes.length - 1; i++) {
                if (descendants.has(trackNodes[i].id) && !descendants.has(trackNodes[i + 1].id)) {
                    descendants.add(trackNodes[i + 1].id); added = true;
                }
            }
        });
        BRANCH_EDGES.forEach(edge => {
            if (descendants.has(edge.from) && !descendants.has(edge.to)) {
                descendants.add(edge.to); added = true;
            }
        });
    }
    return descendants;
};

const getPrerequisiteTitles = (nodeId, processedNodes) => {
    const titles = [];
    const node = processedNodes.find(n => n.id === nodeId);
    if (!node) return "";
    const trackNodes = processedNodes.filter(n => n.track === node.track && !n.is_extra);
    const myIndex = trackNodes.findIndex(n => n.id === node.id);
    if (myIndex > 0) {
        titles.push(trackNodes[myIndex - 1].title);
    }
    BRANCH_EDGES.forEach(edge => {
        if (edge.to === node.id) {
            const p = processedNodes.find(n => n.id === edge.from);
            if (p) titles.push(p.title);
        }
    });
    return titles.join(" or ");
};

const CourseProgressTree = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const containerRef = useRef(null);
    const nodeRefs = useRef({});
    const [lines, setLines] = useState([]);
    
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    
    const progressData = location.state?.course_progress || location.state?.target?.course_progress;

    const ccBreakdown = progressData?.codecombat?.breakdown || [];
    const ozBreakdown = progressData?.ozaria?.breakdown || [];

    const processedNodes = ALIGNED_NODES.map(node => {
        const breakdownList = node.domain === 'codecombat' ? ccBreakdown : ozBreakdown;
        const matchingCourse = breakdownList.find(c => matchCourse(c.course_name, node.aliases));
        return {
            ...node,
            levels_completed: matchingCourse ? matchingCourse.levels_completed : 0,
            levels_total: matchingCourse ? matchingCourse.levels_total : null,
            levels: matchingCourse ? matchingCourse.levels : [],
            has_started: matchingCourse && matchingCourse.levels_completed > 0,
        };
    });

    let extraRow = 17;
    const findUnmappedAndAppend = (breakdownList, domain, trackId) => {
        breakdownList.forEach(c => {
            const isMapped = ALIGNED_NODES.some(node => node.domain === domain && matchCourse(c.course_name, node.aliases));
            if (!isMapped && c.levels_completed > 0) {
                processedNodes.push({
                    id: `extra-${c.course_id}`,
                    title: c.course_name,
                    domain: domain,
                    track: trackId,
                    row: extraRow++,
                    levels_completed: c.levels_completed,
                    levels_total: c.levels_total,
                    levels: c.levels || [],
                    has_started: true,
                    is_extra: true
                });
            }
        });
    };
    findUnmappedAndAppend(ccBreakdown, 'codecombat', 'cs');
    findUnmappedAndAppend(ozBreakdown, 'ozaria', 'ozaria');

    processedNodes.sort((a, b) => a.row - b.row);

    useLayoutEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const recommendedNodeId = useMemo(() => {
        const candidates = processedNodes.filter(_n => true);
        const sorted = [...candidates].sort((a, b) => a.row - b.row);
        
        for (const node of sorted) {
            if (node.has_started && node.levels_completed < (node.levels_total || 999)) {
                return node.id;
            }
            const ancestors = getAncestors(node.id, processedNodes);
            ancestors.delete(node.id);
            if (ancestors.size === 0) return node.id;
            
            let hasActiveParent = false;
            const trackNodes = processedNodes.filter(n => n.track === node.track && !n.is_extra);
            const myIndex = trackNodes.findIndex(n => n.id === node.id);
            if (myIndex > 0 && trackNodes[myIndex - 1].has_started) {
                hasActiveParent = true;
            }
            BRANCH_EDGES.forEach(edge => {
                if (edge.to === node.id) {
                    const p = processedNodes.find(n => n.id === edge.from);
                    if (p && p.has_started) hasActiveParent = true;
                }
            });
            
            if (hasActiveParent) return node.id;
        }
        return null;
    }, [processedNodes]);

    const connectedNodes = useMemo(() => {
        if (!hoveredNodeId) return new Set();
        return new Set([
            ...getAncestors(hoveredNodeId, processedNodes),
            ...getDescendants(hoveredNodeId, processedNodes)
        ]);
    }, [hoveredNodeId, processedNodes]);

    useLayoutEffect(() => {
        const updateLines = () => {
            if (!containerRef.current || !isDesktop) {
                setLines([]);
                return;
            }

            const newLines = [];
            let lineIdCounter = 0;

            TRACKS.forEach(track => {
                const trackNodes = processedNodes.filter(n => n.track === track.id && !n.is_extra);
                for (let i = 0; i < trackNodes.length - 1; i++) {
                    const fromNode = trackNodes[i];
                    const toNode = trackNodes[i + 1];
                    const fromEl = nodeRefs.current[fromNode.id];
                    const toEl = nodeRefs.current[toNode.id];
                    
                    if (fromEl && toEl) {
                        const x = fromEl.offsetLeft + fromEl.offsetWidth / 2;
                        const y1 = fromEl.offsetTop + fromEl.offsetHeight;
                        const y2 = toEl.offsetTop;

                        const isActive = fromNode.has_started && toNode.has_started;
                        const lineDomain = track.id === 'ozaria' ? 'ozaria' : 'codecombat';

                        newLines.push({ id: `track-${track.id}-${lineIdCounter++}`, x1: x, y1, x2: x, y2, isActive, lineDomain, fromId: fromNode.id, toId: toNode.id });
                    }
                }
            });

            setLines(newLines);
        };

        setTimeout(updateLines, 50);
        window.addEventListener('resize', updateLines);
        return () => window.removeEventListener('resize', updateLines);
    }, [processedNodes, isDesktop]);

    const hasScrolledRef = useRef(false);

    useLayoutEffect(() => {
        if (location.state?.highlightCourseName && Object.keys(nodeRefs.current).length > 0 && !hasScrolledRef.current) {
            const highlightName = location.state.highlightCourseName;
            const targetNode = processedNodes.find(n => n.title === highlightName || matchCourse(highlightName, n.aliases || []));
            if (targetNode && nodeRefs.current[targetNode.id]) {
                hasScrolledRef.current = true;
                setTimeout(() => {
                    nodeRefs.current[targetNode.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Optional: add a temporary highlight effect
                    const el = nodeRefs.current[targetNode.id];
                    el.style.transition = 'box-shadow 0.5s ease';
                    el.style.boxShadow = '0 0 20px 5px var(--primary-color)';
                    setTimeout(() => {
                        el.style.boxShadow = '';
                    }, 2000);
                }, 100);
            }
        }
    }, [location.state, processedNodes]);

    if (!progressData) {
        return (
            <div className="report-card-page animate-page-entry" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="report-error glass-panel">
                    <h2>No Progress Data</h2>
                    <p>Could not load the course progress tree. Please return to the profile.</p>
                    <button className="btn-primary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const treeContent = (
        <div className="skill-tree-grid" ref={containerRef}>
            {/* SVG Overlay for Connections */}
            {lines.length > 0 && (
                <svg className="skill-tree-svg-overlay">
                    <defs>
                        <linearGradient id="oz-cs-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#902edb" />
                            <stop offset="100%" stopColor="#2b91af" />
                        </linearGradient>
                    </defs>
                    {lines.map(line => {
                        const isDimmed = hoveredNodeId && (!connectedNodes.has(line.fromId) || !connectedNodes.has(line.toId));
                        return (
                            <line 
                                key={line.id} 
                                x1={line.x1} 
                                y1={line.y1} 
                                x2={line.x2} 
                                y2={line.y2} 
                                className={`tree-line ${line.isActive ? 'active-line' : 'locked-line'} ${line.isActive ? line.lineDomain : ''} ${isDimmed ? 'dimmed' : ''}`}
                            />
                        );
                    })}
                </svg>
            )}

            {/* Desktop Headers */}
            {TRACKS.map(track => {
                const trackNodes = processedNodes.filter(n => n.track === track.id && !n.is_extra);
                let totalPercent = 0;
                trackNodes.forEach(n => {
                    if (n.levels_total) {
                        totalPercent += Math.min((n.levels_completed / n.levels_total), 1);
                    } else if (n.has_started && n.levels_completed > 0) {
                        totalPercent += 1;
                    }
                });
                const percent = trackNodes.length > 0 ? (totalPercent / trackNodes.length) * 100 : 0;
                const isComplete = trackNodes.length > 0 && trackNodes.every(n => n.has_started && n.levels_completed >= (n.levels_total || 1));
                
                return (
                    <div key={track.id} className={`branch-header glass-panel desktop-header ${isComplete ? 'track-completed' : ''}`} style={{ gridColumn: track.col, gridRow: 1, position: 'relative', overflow: 'hidden' }}>
                        <div className="track-progress-bg" style={{ width: `${percent}%` }}></div>
                        <h2 style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span>{track.title}</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 'normal' }}>{Math.round(percent)}%</span>
                        </h2>
                    </div>
                );
            })}
            
            {/* Nodes */}
            {processedNodes.map(node => {
                const trackInfo = TRACKS.find(t => t.id === node.track);
                const isRecommended = node.id === recommendedNodeId;
                const isDimmed = hoveredNodeId && !connectedNodes.has(node.id);
                const prereqs = !node.has_started ? getPrerequisiteTitles(node.id, processedNodes) : "";

                return (
                    <div 
                        key={node.id} 
                        ref={el => nodeRefs.current[node.id] = el}
                        className={`skill-node-cell ${node.has_started ? 'active' : 'locked'} ${node.is_extra ? 'extra-node' : ''} ${isRecommended ? 'recommended' : ''} ${isDimmed ? 'dimmed' : ''}`}
                        style={{ 
                            gridColumn: trackInfo?.col || 1, 
                            gridRow: node.row + 1
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() => navigate(`${location.pathname}/breakdown`, { state: { selectedNode: node } })}
                    >
                        <div className={`skill-card ${node.domain}`} style={{ cursor: 'pointer' }}>
                            <div className="skill-icon">
                                <img 
                                    src={node.domain === 'codecombat' ? codecombatLogo : ozariaLogo} 
                                    alt={`${node.domain} logo`} 
                                    className="domain-logo"
                                />
                            </div>
                            <div className="skill-content">
                                <h3>{node.title}</h3>
                                {node.is_extra && <p className="domain-label">Extra Quest</p>}
                                <div className="course-progress-container">
                                    <div className="course-progress-bar">
                                        <div 
                                            className="course-progress-fill" 
                                            style={{ width: `${node.levels_total ? Math.min((node.levels_completed / node.levels_total) * 100, 100) : (node.levels_completed > 0 ? 100 : 0)}%` }}
                                        ></div>
                                    </div>
                                    {node.levels_completed > 0 && (
                                        <div className="course-progress-text">
                                            <Star size={12} style={{ marginRight: '4px', verticalAlign: 'middle', marginBottom: '2px' }}/>
                                            {node.levels_completed} Levels Completed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {!node.has_started && prereqs && (
                            <div className="node-tooltip">
                                Required: {prereqs}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="course-progress-page animate-page-entry" style={{ position: 'relative' }}>
            <button
                className="subtle-back-btn"
                onClick={() => navigate(-1)}
                title="Go Back"
            >
                <ArrowLeft size={20} />
            </button>

            {treeContent}
        </div>
    );
};

export default CourseProgressTree;
