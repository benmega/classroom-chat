import React, { useLayoutEffect, useRef, useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { showConfirm } from '../../utils/confirm';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, CheckCircle, Code, Box, History, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import SubmitProgressModal from '../../components/common/SubmitProgressModal';
import './CourseProgressTree.css';

import {
    TRACKS, ALIGNED_NODES, matchCourse,
    getAncestors, getDescendants, getPrerequisiteTitles,
    getDomainConfig, getTrackDomain, findLevelForProject
} from '../../constants/courseProgress';

const CourseProgressTree = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { slug } = useParams();
    const { user: authUser } = useAuthStore();
    const isAdmin = authUser?.role === 'admin';
    const isParent = authUser?.role === 'parent' || location.pathname.startsWith('/parent');

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
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const PAN_STEP = 120; // pixels to pan per button press
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
    // The "Claim Ducks" button is left visible for all tracks (including 3D) so students can
    // submit certificates in case they move tracks or complete extra quests.
    const showClaimDucks = true;
    const pendingRequest = localPendingRequest || userObj?.pending_request;

    const progressData = stateProgressData || fetchedProgressData;

    const ccBreakdown = progressData?.codecombat?.breakdown || [];
    const ozBreakdown = progressData?.ozaria?.breakdown || [];
    const tdBreakdown = progressData?.['3d-modeling']?.breakdown || [];

    const processedNodes = ALIGNED_NODES.map(node => {
        let breakdownList = ccBreakdown;
        if (node.domain === 'ozaria') breakdownList = ozBreakdown;
        if (node.domain === '3d-modeling') breakdownList = tdBreakdown;
        
        const matchingCourse = breakdownList.find(c => matchCourse(c.course_name, node.aliases));
        return {
            ...node,
            levels_completed: matchingCourse ? matchingCourse.levels_completed : 0,
            levels_total: matchingCourse ? matchingCourse.levels_total : null,
            levels: matchingCourse ? matchingCourse.levels : [],
            has_started: matchingCourse && matchingCourse.levels_completed > 0,
            last_completed_at: matchingCourse ? matchingCourse.last_completed_at || null : null,
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
                    last_completed_at: c.last_completed_at || null,
                    is_extra: true
                });
            }
        });
    };
    findUnmappedAndAppend(ccBreakdown, 'codecombat', 'cs');
    findUnmappedAndAppend(ozBreakdown, 'ozaria', 'ozaria');
    findUnmappedAndAppend(tdBreakdown, '3d-modeling', '3d');

    processedNodes.sort((a, b) => a.row - b.row);

    useLayoutEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // The first incomplete chapter of every track is highlighted as a possible next step.
    const recommendedNodeIds = useMemo(() => {
        const isCompleted = (node) => !!node.levels_total && node.levels_completed >= node.levels_total;
        const ids = new Set();
        TRACKS.forEach(track => {
            // processedNodes is sorted by row, so the first match is the topmost incomplete chapter
            const firstIncomplete = processedNodes.find(n => n.track === track.id && !n.is_extra && !isCompleted(n));
            if (firstIncomplete) ids.add(firstIncomplete.id);
        });
        return ids;
    }, [processedNodes]);

    // The course with the most recent completed challenge/project is where the camera starts.
    // Null when the student has no timestamped completions (callers fall back to the active track).
    const cameraStartNodeId = useMemo(() => {
        let latestNode = null;
        let latestTime = -Infinity;
        processedNodes.forEach(n => {
            const time = n.last_completed_at ? Date.parse(n.last_completed_at) : NaN;
            if (!Number.isNaN(time) && time > latestTime) {
                latestTime = time;
                latestNode = n;
            }
        });
        return latestNode ? latestNode.id : null;
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
                        const lineDomain = getDomainConfig(getTrackDomain(track.id)).cssClass;

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
                const msg = `Preview for passing ${node.title}:\n- Missing Challenges: ${p.challenges_to_complete}\n- Ducks available: ${p.ducks_to_award}\n- Certificates: ${p.certificates_to_award.join(', ') || 'None'}\n\nThe student gets full credit for these levels and moves on to the next course. Award the ducks for them?`;
                const choice = await showConfirm(msg, { title: 'Pass Chapter', destructive: false, confirmText: 'Pass & award ducks', altText: 'Pass, no ducks' });
                if (choice) {
                    const passRes = await client.post(`/api/admin/user/${userObj.id}/pass_chapter`, { course_id: node.id, award_ducks: choice === true });
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
        // Wait for the profile fetch so the camera starts on the student's own most recent
        // course rather than a default one (3D is column 5, off-screen on most desktops).
        if (isFetching) return;
        if (progressData && Object.keys(nodeRefs.current).length > 0 && !hasCenteredActiveTrackRef.current) {
            let targetNode = processedNodes.find(n => n.id === cameraStartNodeId);
            if (!targetNode) {
                // No completion history: start on the student's active track instead.
                const activeTrackNodes = processedNodes.filter(n => n.track === activeTrack && !n.is_extra);
                targetNode = activeTrackNodes.find(n => recommendedNodeIds.has(n.id)) || activeTrackNodes[0];
            }
            
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
    }, [progressData, activeTrack, cameraStartNodeId, recommendedNodeIds, processedNodes, isFetching]);

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
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                    width: 'max-content',
                    margin: '0 auto',
                }}
            >
                {/* Desktop Headers */}
                <div className="track-headers-container">
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

                    const domainConfig = getDomainConfig(getTrackDomain(track.id));
                    const headerClassName = `branch-header glass-panel desktop-header ${isComplete ? 'track-completed' : ''} pos-rel overflow-hidden`;
                    const headerBody = (
                        <>
                            <div className="track-progress-bg" style={{ width: `${percent}%` }}></div>
                            <div className="pos-rel z-1 d-flex align-center gap-md w-100">
                                <span className="header-logo-link">
                                    <img src={domainConfig.logo} alt="" className="header-logo-img-flat" />
                                </span>
                                <h2 className="d-flex flex-col align-start gap-4px m-0 text-left">
                                    <span>{track.title}</span>
                                    <span className="text-sm opacity-80 fw-normal">{Math.round(percent)}%</span>
                                </h2>
                            </div>
                        </>
                    );

                    // Single-site tracks: the whole header is one external link.
                    if (domainConfig.url) {
                        return (
                            <a
                                key={track.id}
                                href={domainConfig.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${headerClassName} cursor-pointer`}
                                title={domainConfig.linkLabel}
                            >
                                {headerBody}
                                <span className="cpt-sr-only"> (opens in new tab)</span>
                            </a>
                        );
                    }

                    // Multi-tool tracks (3D Modeling: Tinkercad + Blender): the header is a plain
                    // panel with one clearly-named external link per tool (no nested anchors).
                    return (
                        <div key={track.id} className={headerClassName}>
                            {headerBody}
                            <div className="header-tool-links pos-rel z-1">
                                {(domainConfig.tools || []).map(tool => (
                                    <a
                                        key={tool.id}
                                        href={tool.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="header-tool-link"
                                        title={`Open ${tool.name}`}
                                    >
                                        <img src={tool.logo} alt="" className="header-tool-logo" />
                                        <span className="cpt-sr-only">Open {tool.name} (opens in new tab)</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

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

                {/* Nodes */}
                {processedNodes.map(node => {
                    const trackInfo = TRACKS.find(t => t.id === node.track);
                    const isRecommended = recommendedNodeIds.has(node.id);
                    const isDimmed = hoveredNodeId && !connectedNodes.has(node.id);
                    const prereqs = !node.has_started ? getPrerequisiteTitles(node.id, processedNodes) : "";
                    const isComplete = node.levels_total && node.levels_completed >= node.levels_total;
                    const domainConfig = getDomainConfig(node.domain);
                    const domainClass = domainConfig.cssClass;
                    const is3D = node.domain === '3d-modeling';
                    // 3D projects are the course's levels, so list them in course order rather than API (alphabetical) order
                    const levelSequence = (project) => findLevelForProject(project, node.levels || [])?.sequence ?? Infinity;
                    const nodeProjects = is3D
                        ? [...(chapterProjects[node.id] || [])].sort((a, b) => levelSequence(a) - levelSequence(b))
                        : (chapterProjects[node.id] || []);
                    const showComingSoon = is3D && !node.is_extra && !node.levels_total && nodeProjects.length === 0;
                    const ProjectIcon = is3D ? Box : Code;

                    return (
                        <div role="button" tabIndex={0}
                            key={node.id}
                            ref={el => nodeRefs.current[node.id] = el}
                            data-testid="skill-node-cell" className={`skill-node-cell ${node.has_started ? 'active' : 'locked'} ${node.is_extra ? 'extra-node' : ''} ${isRecommended ? 'recommended' : ''} ${isDimmed ? 'dimmed' : ''} ${isComplete ? 'completed' : ''}`}
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
                                <div className={`skill-card ${domainClass} ${isComplete ? 'complete' : ''} cursor-pointer`}>
                                <div
                                    className={`skill-card-bg-fill ${domainClass} ${isComplete ? 'complete' : ''}`}
                                    style={{ width: `${node.levels_total ? Math.min((node.levels_completed / node.levels_total) * 100, 100) : (node.levels_completed > 0 ? 100 : 0)}%` }}
                                ></div>
                                {isComplete && (
                                    <div className={`complete-badge ${domainClass}`} title="100% Complete">
                                        <CheckCircle size={16} />
                                    </div>
                                )}
                                <div className="skill-icon">
                                    {/* Decorative: the course title next to it already names the course */}
                                    <img
                                        src={node.logo || domainConfig.logo}
                                        alt=""
                                        className={`domain-logo ${node.logo ? 'domain-logo-svg' : ''}`}
                                    />
                                </div>
                                <div className="skill-content">
                                    {/* Mobile only (track headers are hidden below 1024px): gives each card its track context */}
                                    {trackInfo && <p className="node-track-label">{trackInfo.title}</p>}
                                    <h3>{node.title}</h3>
                                    {node.is_extra && <p className="domain-label">Extra Quest</p>}
                                    {node.levels_completed > 0 && (
                                        <div className="course-progress-container">
                                            <div className="course-progress-text">
                                                {node.levels_completed}{node.levels_total ? `/${node.levels_total}` : ''} levels
                                            </div>
                                        </div>
                                    )}
                                    {showComingSoon && <p className="node-coming-soon">Projects coming soon</p>}
                                </div>
                            </div>
                            </div>

                            {/* Project Nodes */}
                            {nodeProjects.length > 0 && (
                                <div className="chapter-projects-col">
                                    {nodeProjects.map(project => {
                                        const projectLevel = is3D ? findLevelForProject(project, node.levels) : null;
                                        const projectDone = !!projectLevel?.is_completed;
                                        return (
                                            <button
                                                key={project.id}
                                                type="button"
                                                className={`project-node-btn ${domainClass} ${projectDone ? 'completed' : ''}`}
                                                title={projectDone ? `${project.name} (completed)` : project.name}
                                                aria-label={projectDone ? `${project.name} (completed)` : project.name}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/project-info/${project.id}`, { state: { project } });
                                                }}
                                            >
                                                {projectDone
                                                    ? <CheckCircle size={20} className="project-icon" aria-hidden="true" />
                                                    : <ProjectIcon size={20} className="project-icon" aria-hidden="true" />}
                                            </button>
                                        );
                                    })}
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
            
            {/* Map Navigation Pad — mermaid-style 3×3 grid, bottom-left to avoid Claims Duck/History */}
            <div className="map-nav-pad">
                {/* Row 1: up, zoom-in */}
                <button
                    className="nav-pad-btn"
                    title="Pan Up"
                    onClick={() => setPanY(y => y + PAN_STEP)}
                    style={{ gridColumn: 2, gridRow: 1 }}
                >
                    <ChevronUp size={18} />
                </button>
                <button
                    className="nav-pad-btn"
                    title="Zoom In"
                    onClick={() => setZoom(z => Math.min(1.4, z + ZOOM_BASELINE * 0.1))}
                    disabled={zoom >= 1.4}
                    style={{ gridColumn: 3, gridRow: 1 }}
                >
                    <ZoomIn size={18} />
                </button>

                {/* Row 2: left, reset, right */}
                <button
                    className="nav-pad-btn"
                    title="Pan Left"
                    onClick={() => setPanX(x => x + PAN_STEP)}
                    style={{ gridColumn: 1, gridRow: 2 }}
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    className="nav-pad-btn nav-pad-reset"
                    title="Reset View"
                    onClick={() => { setZoom(ZOOM_BASELINE); setPanX(0); setPanY(0); }}
                    disabled={zoom === ZOOM_BASELINE && panX === 0 && panY === 0}
                    style={{ gridColumn: 2, gridRow: 2 }}
                >
                    <RotateCcw size={16} />
                </button>
                <button
                    className="nav-pad-btn"
                    title="Pan Right"
                    onClick={() => setPanX(x => x - PAN_STEP)}
                    style={{ gridColumn: 3, gridRow: 2 }}
                >
                    <ChevronRight size={18} />
                </button>

                {/* Row 3: down, zoom-out */}
                <button
                    className="nav-pad-btn"
                    title="Pan Down"
                    onClick={() => setPanY(y => y - PAN_STEP)}
                    style={{ gridColumn: 2, gridRow: 3 }}
                >
                    <ChevronDown size={18} />
                </button>
                <button
                    className="nav-pad-btn"
                    title="Zoom Out"
                    onClick={() => setZoom(z => Math.max(0.35, z - ZOOM_BASELINE * 0.1))}
                    disabled={zoom <= 0.35}
                    style={{ gridColumn: 3, gridRow: 3 }}
                >
                    <ZoomOut size={18} />
                </button>
            </div>

            {!isParent && (
                <>
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

                        {showClaimDucks && (
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
                        )}
                    </div>

                    {showClaimDucks && (
                        <SubmitProgressModal
                            isOpen={isSubmitModalOpen}
                            onClose={() => setIsSubmitModalOpen(false)}
                            onUrlChange={(url) => setHasUrlInput(!!url.trim())}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default CourseProgressTree;
