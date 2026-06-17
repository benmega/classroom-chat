import React from 'react';
import { Activity, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
                className="panel-header" 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={(e) => handleNavigate(e)}
                title="View Detailed Tree"
            >
                <h2 style={{ pointerEvents: 'none' }}><Activity size={20} /> Course Progress</h2>
                {!isParentView && (
                    <Link to="/submit-work#challenge" title="Submit Challenge" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
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
                                className="progress-item" 
                                key={idx}
                                onClick={(e) => handleNavigate(e, c.course_name)}
                                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
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
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No courses started yet.</p>
                    )}
                </div>
            </div>
            <div 
                style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={(e) => handleNavigate(e)}
            >
                <strong>{totalLevels}</strong> Total Levels Completed
            </div>
        </section>
    );
};

export default CourseProgress;
