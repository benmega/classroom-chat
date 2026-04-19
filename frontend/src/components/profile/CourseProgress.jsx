import React from 'react';
import { Activity } from 'lucide-react';

const CourseProgress = ({ target }) => {
    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <h2><Activity size={20} /> Course Progress</h2>
            </div>
            <div className="progress-list-container">
                <div className="progress-list">
                    <div className="progress-item">
                        <div className="prog-label">
                            <span>CodeCombat</span>
                            <span>{target.cc_percent || 0}%</span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${target.cc_percent || 0}%` }}></div>
                        </div>
                        <small>{target.cc_levels || 0} Levels Completed</small>
                    </div>
                    {target.oz_levels > 0 && (
                        <div className="progress-item">
                            <div className="prog-label">
                                <span>Ozaria</span>
                                <span>{target.oz_percent || 0}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill ozaria" style={{ width: `${target.oz_percent || 0}%` }}></div>
                            </div>
                            <small>{target.oz_levels} Levels Completed</small>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default CourseProgress;
