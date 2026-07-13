import React from 'react';
import { Activity, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import codecombatLogo from '../../assets/codecombat-logo.png';
import ozariaLogo from '../../assets/ozaria-logo.png';

const CourseProgress = ({ target, isParentView = false, studentId = null }) => {
    const navigate = useNavigate();
    const activeCourses = [];
    if (target.course_progress) {
        const addActive = (breakdown) => {
            if (!breakdown) return;
            const started = breakdown.filter(c => c.levels_completed > 0);
            const inProgress = started.filter(c => c.levels_total && c.levels_completed < c.levels_total);
            inProgress.forEach(c => activeCourses.push(c));

            // Append completed courses if we need more to fill top 3
            const completed = started.filter(c => !c.levels_total || c.levels_completed >= c.levels_total);
            completed.forEach(c => activeCourses.push(c));
        };

        addActive(target.course_progress.codecombat?.breakdown);
        addActive(target.course_progress.ozaria?.breakdown);
    }

    // De-duplicate if needed and get top 3
    const displayCourses = activeCourses.slice(0, 3);
    const ccLevels = target.cc_levels !== undefined ? target.cc_levels : (target.course_progress?.codecombat?.levels_completed || 0);
    const ozLevels = target.oz_levels !== undefined ? target.oz_levels : (target.course_progress?.ozaria?.levels_completed || 0);
    const totalLevels = ccLevels + ozLevels;

    if (totalLevels === 0) return null;

    const handleNavigate = (e, courseName = null) => {
        if (e) {
            e.stopPropagation();
        }
        if (isParentView && studentId) {
            navigate(`/parent/course-progress/${studentId}`, { state: { target, highlightCourseName: courseName } });
        } else {
            navigate(`/course-progress/${target.slug}`, { state: { target, highlightCourseName: courseName } });
        }
    };

    return (
        <section className="dashboard-panel">
            <div
                className="panel-header d-flex justify-between align-center cursor-pointer"
                onClick={(e) => handleNavigate(e)}
                title="View Detailed Tree"
            >
                <h2 className="pointer-events-none d-flex align-center gap-sm">
                    <Activity size={20} /> Course Progress
                </h2>
                <div className="d-flex align-center gap-sm ml-auto mr-xs" onClick={e => e.stopPropagation()}>
                    <a
                        href="https://codecombat.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="header-logo-card"
                        title="Visit CodeCombat"
                    >
                        <img src={codecombatLogo} alt="CodeCombat" className="header-logo-img" />
                    </a>
                    <a
                        href="https://ozaria.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="header-logo-card"
                        title="Visit Ozaria"
                    >
                        <img src={ozariaLogo} alt="Ozaria" className="header-logo-img" />
                    </a>
                </div>
                {!isParentView && (
                    <Link to="/submit-work#challenge" title="Submit Challenge" className="text-secondary d-flex align-center ml-xs" onClick={e => e.stopPropagation()}>
                        <Plus size={20} />
                    </Link>
                )}
            </div>
            <div className="progress-list-container">
                <div className="progress-list">
                    {displayCourses.length > 0 ? displayCourses.map((c, idx) => {
                        const percent = c.levels_total ? Math.round((c.levels_completed / c.levels_total) * 100) : 100;
                        const isOzaria = c.course_name.toLowerCase().includes('ozaria') || c.course_id?.toLowerCase().includes('ozaria');
                        return (
                            <div
                                key={idx}
                                onClick={(e) => handleNavigate(e, c.course_name)}
                                className="progress-item cursor-pointer transition-bg"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--panel-hover-bg, rgba(255,255,255,0.05))'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title="View in Course Tree"
                            >
                                <div className="prog-label">
                                    <span>{c.course_name}</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="progress-track">
                                    <div className={`progress-fill ${isOzaria ? 'ozaria' : ''}`} style={{ width: `${percent}%` }}></div>
                                </div>
                                <small>{c.levels_completed} / {c.levels_total || c.levels_completed} Levels</small>
                            </div>
                        );
                    }) : (
                        <p className="text-center text-muted">No courses started yet.</p>
                    )}
                </div>
            </div>
            <div
                className="mt-md text-center text-secondary text-sm cursor-pointer"
                onClick={(e) => handleNavigate(e)}
            >
                <strong>{totalLevels}</strong> Total Levels Completed
            </div>
        </section>
    );
};

export default CourseProgress;
