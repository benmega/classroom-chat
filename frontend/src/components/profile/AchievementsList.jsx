import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Plus } from 'lucide-react';
<<<<<<< Updated upstream

const AchievementsList = ({ achievements }) => {
    const navigate = useNavigate();

=======

const AchievementsList = ({ achievements, isOwner }) => {
    const navigate = useNavigate();

>>>>>>> Stashed changes
    if (!achievements || achievements.length === 0) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2><Award size={20} /> Recent Achievements</h2>
                <Link to="/achievements" title="View All Achievements" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <Plus size={20} />
                </Link>
            </div>
            <div className="achievement-strip-container">
                <div className="achievement-strip">
                    {achievements.map(ua => (
                        <div key={ua.id} className="ach-strip-item" title={ua.achievement?.description} onClick={() => navigate('/achievements')} style={{ cursor: 'pointer' }}>
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
