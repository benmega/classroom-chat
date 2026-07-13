import React, { useState, useEffect, useMemo } from 'react';
import { 
    Coins, 
    Lock 
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Achievements.css';
import '../../assets/css/sprite.css'; 
import Skeleton from '../../components/common/Skeleton';


const Achievements = () => {
    const [achievements, setAchievements] = useState([]);
    const [userAchievements, setUserAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const response = await client.get('/api/achievements/all');
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

    const groupedAchievements = useMemo(() => {
        const groups = {};
        const result = [];

        achievements.forEach(ach => {
            if (ach.type === 'certificate') {
                if (ach.name === 'Junior') {
                    const key = 'cert-CS';
                    if (!groups[key]) groups[key] = [];
                    ach._certLevel = 0;
                    groups[key].push(ach);
                } else {
                    const match = ach.name.match(/^([a-zA-Z\s]+?)(\d+)$/);
                    if (match) {
                        const key = `cert-${match[1].trim()}`;
                        if (!groups[key]) groups[key] = [];
                        ach._certLevel = parseInt(match[2], 10);
                        groups[key].push(ach);
                    } else {
                        result.push(ach);
                    }
                }
            } else {
                const key = `${ach.type}-${ach.source || ''}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(ach);
            }
        });

        Object.values(groups).forEach(group => {
            const isCertGroup = group.length > 0 && group[0].type === 'certificate';

            if (isCertGroup) {
                group.sort((a, b) => a._certLevel - b._certLevel);
                
                const lowestUnearnedIndex = group.findIndex(ach => !userAchievements.includes(ach.id));
                const lowestUnearned = lowestUnearnedIndex >= 0 ? group[lowestUnearnedIndex] : null;
                
                const highestContiguousEarned = lowestUnearnedIndex > 0 ? group[lowestUnearnedIndex - 1] 
                                             : (lowestUnearnedIndex === -1 ? group[group.length - 1] : null);
                
                if (highestContiguousEarned) {
                    result.push({ ...highestContiguousEarned, nextLevel: lowestUnearned, isGrouped: true, isEarned: true });
                } else if (lowestUnearned) {
                    result.push({ ...lowestUnearned, nextLevel: null, isGrouped: true, isEarned: false });
                }

                const outOfOrderStartIndex = lowestUnearnedIndex === -1 ? group.length : lowestUnearnedIndex + 1;
                for (let i = outOfOrderStartIndex; i < group.length; i++) {
                    if (userAchievements.includes(group[i].id)) {
                        result.push({ ...group[i], nextLevel: null, isGrouped: true, isEarned: true });
                    }
                }
            } else {
                group.sort((a, b) => Number(a.requirement_value || 0) - Number(b.requirement_value || 0));
                
                let highestEarnedIndex = -1;
                for (let i = group.length - 1; i >= 0; i--) {
                    if (userAchievements.includes(group[i].id)) {
                        highestEarnedIndex = i;
                        break;
                    }
                }

                const highestEarned = highestEarnedIndex >= 0 ? group[highestEarnedIndex] : null;
                const nextLevel = highestEarnedIndex + 1 < group.length ? group[highestEarnedIndex + 1] : null;

                if (highestEarned) {
                    result.push({ ...highestEarned, nextLevel, isGrouped: true, isEarned: true });
                } else if (nextLevel) {
                    result.push({ ...nextLevel, nextLevel: null, isGrouped: true, isEarned: false });
                }
            }
        });

        return result;
    }, [achievements, userAchievements]);

    // Shorten descriptions for tooltip display
    const shortenDescription = (desc, _type) => {
        if (!desc) return '';
        // Already short enough
        if (desc.length <= 80) return desc;
        // Trim at word boundary
        const trimmed = desc.slice(0, 77);
        return trimmed.slice(0, trimmed.lastIndexOf(' ')) + '…';
    };

    if (isLoading) {
        return (
            <div className="achievements-page">
                <div className="achievements-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="achievement-card locked">
                            <Skeleton height="80px" className="skeleton-card" />
                            <div className="ach-info">
                                <Skeleton height="16px" width="70%" className="skeleton-title" />
                                <Skeleton height="13px" width="90%" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="achievements-page">
            <div className="achievements-grid">
                {groupedAchievements.length > 0 ? (
                    groupedAchievements.map((ach) => {
                        const isEarned = ach.isGrouped ? ach.isEarned : userAchievements.includes(ach.id);
                        
                        // Show progress for the next level if grouped and earned
                        const showNextLevelProgress = ach.isGrouped && ach.isEarned && ach.nextLevel;
                        const progressTarget = showNextLevelProgress ? ach.nextLevel : ach;
                        
                        const progressPct = progressTarget.requirement_value
                            ? Math.min(100, (progressTarget.current_progress / progressTarget.requirement_value) * 100)
                            : 0;
                        const hasProgress = progressTarget.type !== 'certificate' && (!isEarned || showNextLevelProgress) && progressTarget.requirement_value;
                        const tooltipText = shortenDescription(ach.description, ach.type);
                        const nextAchievement = !isEarned ? ach : (ach.isGrouped ? ach.nextLevel : null);

                        return (
                            <div
                                key={ach.id}
                                className={`achievement-card ${isEarned ? 'earned' : 'locked'} ach-type-${ach.type}`}
                                title={tooltipText}
                            >
                                <div className="ach-card-top">
                                    <div className="badge-wrapper">
                                        <div className={`badge badge-${ach.slug}`}>&nbsp;</div>
                                        {!isEarned && (
                                            <div className="lock-overlay">
                                                <Lock size={20} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="ach-info">
                                        <h3 className="achievement-name">{ach.name}</h3>
                                        {nextAchievement && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '600' }}>
                                                Next: {nextAchievement.name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {nextAchievement ? (
                                    <div className="ach-card-footer">
                                        <div className="ach-progress-container">
                                            {hasProgress ? (
                                                <div className="ach-progress-bar-wrapper">
                                                    <div className="ach-progress-bar-fill" style={{ width: `${progressPct}%` }} />
                                                    <span className="ach-progress-text">
                                                        {progressTarget.current_progress || 0} / {progressTarget.requirement_value}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="ach-no-progress-text">
                                                    Ready to Unlock
                                                </div>
                                            )}
                                        </div>
                                        <div className="ach-reward-indicator">
                                            <Coins size={14} />
                                            <span>+{nextAchievement.reward}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="ach-card-footer completed">
                                        <span className="ach-completed-text">🎉 Fully Completed</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-achievements">
                        <h3>No achievements found</h3>
                        <p>Start completing tasks to earn achievements!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Achievements;
