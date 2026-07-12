import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Plus } from 'lucide-react';

const AchievementsList = ({ achievements }) => {
    const navigate = useNavigate();

    if (!achievements || achievements.length === 0) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header d-flex justify-between align-center">
                <h2><Award size={20} /> Recent Achievements</h2>
                <Link to="/achievements" title="View All Achievements" className="text-secondary d-flex align-center">
                    <Plus size={20} />
                </Link>
            </div>
            <div className="achievement-strip-container">
                <div className="achievement-strip">
                    {achievements.map(ua => (
                        <div key={ua.id} className="ach-strip-item" title={ua.achievement?.description} onClick={() => navigate('/achievements')} className="cursor-pointer">
                            <div className={`badge badge-${ua.achievement?.slug || 'default'} mini`}>&nbsp;</div>
                            <div className="ach-strip-info">
                                <span className="ach-name">{ua.achievement?.name}</span>
                                <span className="ach-date">{new Date(ua.earned_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AchievementsList;
