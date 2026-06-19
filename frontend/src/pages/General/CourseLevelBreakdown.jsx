import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import './CourseProgressTree.css';

const CourseLevelBreakdown = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const selectedNode = location.state?.selectedNode;

    if (!selectedNode) {
        return (
            <div className="course-progress-container" style={{ padding: '2rem' }}>
                <button className="back-button" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <h2>Course data not found</h2>
                <p>Please go back and select a valid course.</p>
            </div>
        );
    }

    return (
        <div className="course-progress-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button className="back-button" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}>
                <ArrowLeft size={20} />
                <span>Back to Skill Tree</span>
            </button>
            
            <div className="course-modal-content" style={{ maxWidth: '100%', boxShadow: 'none', padding: '0', background: 'transparent' }}>
                <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{selectedNode.title}</h1>
                <div className="course-modal-progress" style={{ marginBottom: '2.5rem' }}>
                    <div className="course-progress-bar" style={{ height: '12px' }}>
                        <div 
                            className="course-progress-fill" 
                            style={{ 
                                width: `${selectedNode.levels_total ? Math.min((selectedNode.levels_completed / selectedNode.levels_total) * 100, 100) : (selectedNode.levels_completed > 0 ? 100 : 0)}%`, 
                                background: selectedNode.domain === 'codecombat' ? '#2b91af' : '#902edb' 
                            }}
                        ></div>
                    </div>
                    <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.75rem' }}>
                        {selectedNode.levels_completed} {selectedNode.levels_total ? `/ ${selectedNode.levels_total}` : ''} Levels Completed
                    </span>
                </div>
                
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Levels Breakdown</h3>
                <div className="levels-list" style={{ overflowY: 'visible', gap: '0.75rem' }}>
                    {selectedNode.levels && selectedNode.levels.length > 0 ? (
                        selectedNode.levels.map((lvl, index) => (
                            <div key={index} className={`level-item ${lvl.is_completed ? 'completed' : 'uncompleted'}`} style={{ padding: '1rem 1.25rem' }}>
                                <div className="level-item-icon">
                                    {lvl.is_completed && <Check size={18} />}
                                </div>
                                <span style={{ fontSize: '1.05rem' }}>{lvl.name}</span>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-md)' }}>
                            No levels found for this course.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseLevelBreakdown;
