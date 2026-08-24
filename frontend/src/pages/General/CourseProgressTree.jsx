import React, { useLayoutEffect, useRef, useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { ArrowLeft, Star, ZoomIn, ZoomOut, Maximize2, CheckCircle, Code, History } from 'lucide-react';
import codecombatLogo from '../../assets/codecombat-logo.png';
import ozariaLogo from '../../assets/ozaria-logo.png';
import useAuthStore from '../../store/useAuthStore';
import SubmitProgressModal from '../../components/common/SubmitProgressModal';
import './CourseProgressTree.css';

import {
    TRACKS, ALIGNED_NODES, BRANCH_EDGES, matchCourse,
    getAncestors, getDescendants, getPrerequisiteTitles
} from '../../constants/courseProgress';

const CourseProgressTree = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { slug } = useParams();
    const { user: authUser } = useAuthStore();
    const isAdmin = authUser?.role === 'admin';

    const containerRef = useRef(null);
    const nodeRefs = useRef({});
    const [lines, setLines] = useState([]);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchedUser, setFetchedUser] = useState(null);
    const [fetchedProgressData, setFetchedProgressData] = useState(null);
    const [localPendingRequest] = useState(null);
    // Baseline scale factor treated as the "100%" zoom level (naturally zoomed out ~30% from the raw 1.0 scale)
    const ZOOM_BASELINE = 0.7;
    const [zoom, setZoom] = useState(ZOOM_BASELINE);
    const [chapterProjects, setChapterProjects] = useState({});
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [hasUrlInput, setHasUrlInput] = useState(false);

    const stateProgressData = location.state?.course_progress || location.state?.target?.course_progress;

    // If no data was passed via navigation state, fetch from API using the slug
    useEffect(() => {
        if ((!stateProgressData || !location.state?.target) && slug) {
            setIsFetching(true);
            client.get(`/user/profile/${slug}`)
                .then(res => {
                    const target = res.data?.data?.target;
                    if (target) {
                        setFetchedUser(target);
                        if (target.course_progress) {
                            setFetchedProgressData(target.course_progress);
                        }
                    }
                })
                .catch(() => {
                    // fetchedProgressData stays null → error state shown below
                })
                .finally(() => setIsFetching(false));
        }
    }, [slug, stateProgressData, location.state]);

    useEffect(() => {
        client.get('/api/project-templates')
            .then(res => {
                const templates = res.data?.data?.templates || {};
                const projectsMap = {};
                
                Object.values(templates).forEach(template => {
                    if (!template.chapter) return;
                    
                    const node = ALIGNED_NODES.find(n => matchCourse(template.chapter, n.aliases));
                    if (node) {
                        if (!projectsMap[node.id]) projectsMap[node.id] = [];
                        projectsMap[node.id].push(template);
                    }
                });

                setChapterProjects(projectsMap);
            })
            .catch(err => console.error("Failed to fetch project templates", err));
    }, []);

    const userObj = location.state?.target || fetchedUser;
    const activeTrack = userObj?.active_track || 'cs';
    const pendingRequest = localPendingRequest || userObj?.pending_request;

    const progressData = stateProgressData || fetchedProgressData;

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
        const isCompleted = (node) => {
            return !!node.levels_total && node.levels_completed >= node.levels_total;
        };

        const completedNodes = processedNodes.filter(n => !n.is_extra && isCompleted(n));

        if (completedNodes.length > 0) {
            // Sort completed nodes by row descending to find the last completed node
            const sortedCompleted = [...completedNodes].sort((a, b) => b.row - a.row);
            const lastCompletedNode = sortedCompleted[0];

            // 1. Try to find the next node in the same track
            const trackNodes = processedNodes.filter(n => n.track === lastCompletedNode.track && !n.is_extra);
            const nextInTrack = trackNodes.find(n => n.row > lastCompletedNode.row && !isCompleted(n));
            if (nextInTrack) {
                return nextInTrack.id;
            }

            // 2. Column is completed, "look down" (find any incomplete node below lastCompletedNode's row)
            const nextDownNodes = processedNodes.filter(n => n.row > lastCompletedNode.row && !n.is_extra && !isCompleted(n));
            if (nextDownNodes.length > 0) {
                // Sort by row ascending to get the closest one down
                const sortedDown = [...nextDownNodes].sort((a, b) => a.row - b.row);
                return sortedDown[0].id;
            }

            // 3. Very last/bottom completed or no next chapter down: go up and find the most farthest down incomplete chapter
            const allIncomplete = processedNodes.filter(n => !n.is_extra && !isCompleted(n));
            if (allIncomplete.length > 0) {
                const sortedIncomplete = [...allIncomplete].sort((a, b) => b.row - a.row);
                return sortedIncomplete[0].id;
            }
        } else {
            // If none are completed, suggest the first/topmost incomplete chapter
            const allIncomplete = processedNodes.filter(n => !n.is_extra && !isCompleted(n));
            if (allIncomplete.length > 0) {
                const sortedIncomplete = [...allIncomplete].sort((a, b) => a.row - b.row);
                return sortedIncomplete[0].id;
            }
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

                        newLines.push({ id: `track-${track.id}-${lineIdCounter++}`, x1: x, y1, x2: x, y2, isActive, lineDomain, fromId: fromNode.id, toId: toNode.id, trackId: track.id });
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
    const hasCenteredActiveTrackRef = useRef(false);

    const handleAdminPass = async (e, node) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userObj?.id) return;
        
        try {
            const previewRes = await client.post(`/api/admin/user/${userObj.id}/pass_chapter_preview`, { course_id: node.id });
            const previewData = previewRes.data.data || previewRes.data;
            if (previewData.success) {
                const p = previewData.preview;
                const msg = `Preview for passing ${node.title}:\n- Missing Challenges: ${p.challenges_to_complete}\n- Ducks to award: ${p.ducks_to_award}\n- Certificates: ${p.certificates_to_award.join(', ') || 'None'}\n\nAre you sure you want to pass this chapter?`;
                if (window.confirm(msg)) {
                    const passRes = await client.post(`/api/admin/user/${userObj.id}/pass_chapter`, { course_id: node.id });
                    const passData = passRes.data.data || passRes.data;
                    if (passData.success) {
                        // Clear the cached router state so a reload fetches fresh data from the server
                        navigate(location.pathname, { replace: true, state: {} });
                        setTimeout(() => {
                            window.location.reload();
                        }, 50);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to pass chapter');
        }
    };

    useEffect(() => {
        if (progressData && Object.keys(nodeRefs.current).length > 0 && !hasCenteredActiveTrackRef.current) {
            const activeTrackNodes = processedNodes.filter(n => n.track === activeTrack && !n.is_extra);
            const targetNode = activeTrackNodes.find(n => n.id === recommendedNodeId) || activeTrackNodes[0];
            
            if (targetNode && nodeRefs.current[targetNode.id]) {
                hasCenteredActiveTrackRef.current = true;
                setTimeout(() => {
                    if (nodeRefs.current[targetNode.id]?.scrollIntoView) {
                        nodeRefs.current[targetNode.id].scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'center'
                        });
                    }
                }, 300);
            }
        }
    }, [progressData, activeTrack, recommendedNodeId, processedNodes]);

    useLayoutEffect(() => {
        if (location.state?.highlightCourseName && Object.keys(nodeRefs.current).length > 0 && !hasScrolledRef.current) {
            const highlightName = location.state.highlightCourseName;
            const targetNode = processedNodes.find(n => n.title === highlightName || matchCourse(highlightName, n.aliases || []));
            if (targetNode && nodeRefs.current[targetNode.id]) {
                hasScrolledRef.current = true;
                hasCenteredActiveTrackRef.current = true; // Skip active track centering if we are explicitly highlighting a specific course
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

    if (!progressData && !isFetching) {
        return (
            <div className="report-card-page animate-page-entry p-2rem text-center">
                <div className="report-error glass-panel">
                    <h2>No Progress Data</h2>
                    <p>Could not load the course progress tree. Please return to the profile.</p>
                    <button className="btn-primary mt-md" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    const treeContent = (
        <div className="skill-tree-container">
            <div 
                className="zoomable-map-wrapper"
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                    width: 'max-content',
                    margin: '0 auto',
                }}
            >
                {/* Desktop Headers */}
                <div className={`track-headers-container ${activeTrack ? 'has-active-track' : ''}`}>
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

                    const isOzaria = track.id === 'ozaria';
                    const logoSrc = isOzaria ? ozariaLogo : codecombatLogo;
                    const linkUrl = isOzaria ? 'https://ozeria.com' : 'https://codecombat.com';
                    const linkTitle = isOzaria ? 'Visit Ozaria' : 'Visit CodeCombat';

                    return (
                        <a 
                            key={track.id} 
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`branch-header glass-panel desktop-header ${isComplete ? 'track-completed' : ''} pos-rel overflow-hidden cursor-pointer ${track.id === activeTrack ? 'active-track-header' : 'de-emphasized-track-header'}`}
                            title={linkTitle}
                        >
                            <div className="track-progress-bg" style={{ width: `${percent}%` }}></div>
                            <div className="pos-rel z-1 d-flex align-center gap-md w-100">
                                <span className="header-logo-link">
                                    <img src={logoSrc} alt={track.title} className="header-logo-img-flat" />
                                </span>
                                <h2 className="d-flex flex-col align-start gap-4px m-0 text-left">
                                    <span>{track.title}</span>
                                    <span className="text-sm opacity-80 fw-normal">{Math.round(percent)}%</span>
                                </h2>
                            </div>
                        </a>
                    );
                })}
            </div>

            <div className={`skill-tree-grid ${activeTrack ? 'has-active-track' : ''}`} ref={containerRef}>
                {/* SVG Overlay for Connections */}
                {lines.length > 0 && (
                    <svg className={`skill-tree-svg-overlay ${activeTrack ? 'has-active-track' : ''}`}>
                        <defs>
                            <linearGradient id="oz-cs-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#902edb" />
                                <stop offset="100%" stopColor="#2b91af" />
                            </linearGradient>
                        </defs>
                        {lines.map(line => {
                            const isDimmed = hoveredNodeId && (!connectedNodes.has(line.fromId) || !connectedNodes.has(line.toId));
                            const isActiveTrackLine = line.trackId === activeTrack;
                            return (
                                <line
                                    key={line.id}
                                    x1={line.x1}
                                    y1={line.y1}
                                    x2={line.x2}
                                    y2={line.y2}
                                    className={`tree-line ${line.isActive ? 'active-line' : 'locked-line'} ${line.isActive ? line.lineDomain : ''} ${isDimmed ? 'dimmed' : ''} ${isActiveTrackLine ? 'active-track-line' : 'de-emphasized-track-line'}`}
                                />
                            );
                        })}
                    </svg>
                )}

                {/* Nodes */}
                {processedNodes.map(node => {
                    const trackInfo = TRACKS.find(t => t.id === node.track);
                    const isRecommended = node.id === recommendedNodeId;
                    const isDimmed = hoveredNodeId && !connectedNodes.has(node.id);
                    const prereqs = !node.has_started ? getPrerequisiteTitles(node.id, processedNodes) : "";
                    const isComplete = node.levels_total && node.levels_completed >= node.levels_total;

                    return (
                        <div role="button" tabIndex={0}
                            key={node.id}
                            ref={el => nodeRefs.current[node.id] = el}
                            className={`skill-node-cell ${node.has_started ? 'active' : 'locked'} ${node.is_extra ? 'extra-node' : ''} ${isRecommended ? 'recommended' : ''} ${isDimmed ? 'dimmed' : ''} ${isComplete ? 'completed' : ''} ${node.track === activeTrack ? 'active-track-node' : 'de-emphasized-track-node'}`}
                            style={{
                                gridColumn: trackInfo?.col || 1,
                                gridRow: node.row + 1
                            }}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                            onClick={() => navigate(`${location.pathname}/breakdown`, { 
                                state: { 
                                    selectedNode: node,
                                    activeTrack: activeTrack,
                                    pendingRequest: pendingRequest,
                                    userObj: userObj
                                } 
                            })}
                        >
                            <div style={{ position: 'relative' }}>
                                {isAdmin && (
                                    <button 
                                        type="button"
                                        className="btn-admin-pass-chapter"
                                        onClick={(e) => handleAdminPass(e, node)}
                                        title="Admin Override: Pass Chapter"
                                        style={{ position: 'absolute', top: '-10px', right: '-10px', zIndex: 10, background: 'var(--success-color, #28a745)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                )}
                                <div className={`skill-card ${node.domain} ${node.levels_total && node.levels_completed >= node.levels_total ? 'complete' : ''} cursor-pointer`}>
                                <div 
                                    className={`skill-card-bg-fill ${node.domain} ${node.levels_total && node.levels_completed >= node.levels_total ? 'complete' : ''}`}
                                    style={{ width: `${node.levels_total ? Math.min((node.levels_completed / node.levels_total) * 100, 100) : (node.levels_completed > 0 ? 100 : 0)}%` }}
                                ></div>
                                {node.levels_total && node.levels_completed >= node.levels_total && (
                                    <div className={`complete-badge ${node.domain}`} title="100% Complete">
                                        <CheckCircle size={16} />
                                    </div>
                                )}
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
                                    {node.levels_completed > 0 && (
                                        <div className="course-progress-container">
                                            <div className="course-progress-text">
                                                {node.levels_completed}{node.levels_total ? `/${node.levels_total}` : ''} levels
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            </div>
                            
                            {/* Project Nodes */}
                            {chapterProjects[node.id] && chapterProjects[node.id].length > 0 && (
                                <div className="chapter-projects-col">
                                    {chapterProjects[node.id].map(project => (
                                        <button
                                            key={project.id}
                                            className="project-node-btn"
                                            title={project.name}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/project-info/${project.id}`, { state: { project } });
                                            }}
                                        >
                                            <Code size={20} className="project-icon" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {!node.has_started && prereqs && (
                                <div className="node-tooltip">
                                    Required: {prereqs}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            </div>
        </div>
    );

    return (
        <div className="course-progress-page animate-page-entry">
            {treeContent}
            
            {/* Zoom Controls */}
            <div className="zoom-controls glass-panel">
                <button
                    onClick={() => setZoom(z => Math.max(0.35, z - ZOOM_BASELINE * 0.1))}
                    className="zoom-btn"
                    title="Zoom Out"
                    disabled={zoom <= 0.35}
                >
                    <ZoomOut size={18} />
                </button>
                <span className="zoom-value">{Math.round((zoom / ZOOM_BASELINE) * 100)}%</span>
                <button
                    onClick={() => setZoom(z => Math.min(1.4, z + ZOOM_BASELINE * 0.1))}
                    className="zoom-btn"
                    title="Zoom In"
                    disabled={zoom >= 1.4}
                >
                    <ZoomIn size={18} />
                </button>
                <button
                    onClick={() => setZoom(ZOOM_BASELINE)}
                    className="zoom-btn reset-btn"
                    title="Reset Zoom"
                    disabled={zoom === ZOOM_BASELINE}
                >
                    <Maximize2 size={16} />
                </button>
            </div>

            {/* Quick Submit Widget */}
            <div style={{
                position: 'fixed',
                bottom: '6rem',
                right: '2rem',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <Link 
                    to="/activity" 
                    className="btn-icon"
                    style={{ 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-subtle)', 
                        boxShadow: 'var(--shadow-md)', 
                        padding: '0.75rem', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)'
                    }}
                    title="View History"
                >
                    <History size={20} />
                </Link>

                <button 
                    id="claim-ducks-btn"
                    className="btn-premium" 
                    onClick={() => {
                        if (isSubmitModalOpen) {
                            const btn = document.getElementById('claim-ducks-submit-btn');
                            if (btn) btn.click();
                        } else {
                            setIsSubmitModalOpen(true);
                        }
                    }}
                    style={{ 
                        padding: '0.75rem 1.5rem',
                        borderRadius: '30px',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '1rem'
                    }}
                >
                    <CheckCircle size={18} />
                    {hasUrlInput ? 'Go!!!' : 'Claim Ducks'}
                </button>
            </div>

            <SubmitProgressModal 
                isOpen={isSubmitModalOpen} 
                onClose={() => setIsSubmitModalOpen(false)} 
                onUrlChange={(url) => setHasUrlInput(!!url.trim())}
            />
        </div>
    );
};

export default CourseProgressTree;
