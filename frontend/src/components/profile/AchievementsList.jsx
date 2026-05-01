import React from 'react';
import { Award } from 'lucide-react';

const AchievementsList = ({ achievements }) => {
    if (!achievements || achievements.length === 0) return null;

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <h2><Award size={20} /> Recent Achievements</h2>
            </div>
            <div className="achievement-strip-container">
                <div className="achievement-strip">
                    {achievements.map(ua => (
                        <div key={ua.id} className="ach-strip-item" title={ua.achievement?.description}>
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
