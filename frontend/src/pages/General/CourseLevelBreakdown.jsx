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
            <div className="course-progress-container p-2rem">
                <button className="back-button" onClick={() => navigate(-1)} className="mb-2rem">
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <h2>Course data not found</h2>
                <p>Please go back and select a valid course.</p>
            </div>
        );
    }

    return (
        <div className="course-progress-container course-progress-modal-container">
            <button className="back-button" onClick={() => navigate(-1)} className="mb-2rem">
                <ArrowLeft size={20} />
                <span>Back to Skill Tree</span>
            </button>
            
            <div className="course-modal-content course-modal-content-styled">
                <h1 className="mb-1-5rem text-primary">{selectedNode.title}</h1>
                <div className="course-modal-progress mb-2-5rem">
                    <div className="course-progress-bar h-12px">
                        <div 
                            className="course-progress-fill" 
                            style={{ 
                                width: `${selectedNode.levels_total ? Math.min((selectedNode.levels_completed / selectedNode.levels_total) * 100, 100) : (selectedNode.levels_completed > 0 ? 100 : 0)}%`, 
                                background: selectedNode.domain === 'codecombat' ? '#2b91af' : '#902edb' 
                            }}
                        ></div>
                    </div>
                    <span className="text-md text-secondary d-block mt-0-75rem">
                        {selectedNode.levels_completed} {selectedNode.levels_total ? `/ ${selectedNode.levels_total}` : ''} Levels Completed
                    </span>
                </div>
                
                <h3 className="mb-md text-primary">Levels Breakdown</h3>
                <div className="levels-list overflow-y-visible gap-0-75rem">
                    {selectedNode.levels && selectedNode.levels.length > 0 ? (
                        selectedNode.levels.map((lvl, index) => (
                            <div key={index} className={`level-item ${lvl.is_completed ? 'completed' : 'uncompleted'} p-1rem-1-25rem`}>
                                <div className="level-item-icon">
                                    {lvl.is_completed && <Check size={18} />}
                                </div>
                                <span className="text-1-05rem">{lvl.name}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted text-center p-2rem bg-surface-sec radius-md">
                            No levels found for this course.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseLevelBreakdown;
