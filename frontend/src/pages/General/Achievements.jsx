import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Achievements.css';
import '../../assets/css/sprite.css'; 

const Achievements = () => {
    const [achievements, setAchievements] = useState([]);
    const [userAchievements, setUserAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const response = await client.get('/achievements/');
                const { achievements, user_achievements } = response.data.data;
                setAchievements(achievements);
                setUserAchievements(user_achievements);
            } catch (error) {
                console.error('Error fetching achievements:', error);
                toast.error('Failed to load achievements.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAchievements();
    }, []);

    if (isLoading) {
        return <div className="loading-container">Loading achievements...</div>;
    }

    return (
        <div className="achievements-page">
            <h2 className="page-title">Achievements</h2>
            <div className="achievements-grid">
                {achievements.map((ach) => {
                    const isEarned = userAchievements.includes(ach.id);
                    return (
                        <div key={ach.id} className={`achievement-card ${isEarned ? 'earned' : 'locked'}`}>
                            <div className="badge-container">
                                <div className={`badge badge-${ach.slug}`}>&nbsp;</div>
                                {!isEarned && (
                                    <div className="overlay">
                                        <span className="lock-icon">Lock</span>
                                    </div>
                                )}
                            </div>

                            <strong className="achievement-name">{ach.name}</strong>
                            <div className="tooltip">
                                <span className="info-icon">Info</span>
                                <span className="tooltiptext">
                                    {ach.description} - {ach.reward} ducks
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Achievements;
