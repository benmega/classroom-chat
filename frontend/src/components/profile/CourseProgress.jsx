import React from 'react';
import { Activity, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const CourseProgress = ({ target }) => {
    return (
        <section className="dashboard-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2><Activity size={20} /> Course Progress</h2>
                <Link to="/submit-work#challenge" title="Submit Challenge" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <Plus size={20} />
                </Link>
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
