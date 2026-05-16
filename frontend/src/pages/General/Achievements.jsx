import React, { useState, useEffect, useMemo } from 'react';
import { 
    Award, 
    TrendingUp, 
    Coins, 
    Lock, 
    Info, 
    Search,
    ChevronDown,
    Filter,
    Shield,
    Users,
    Activity,
    Code,
    MessageCircle,
    Repeat,
    Briefcase,
    FileText
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');

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

    const stats = useMemo(() => {
        if (!achievements.length) return null;
        
        const totalPossible = achievements.length;
        const earnedCount = userAchievements.length;
        const percent = Math.round((earnedCount / totalPossible) * 100);
        
        const totalDucks = achievements
            .filter(a => userAchievements.includes(a.id))
            .reduce((sum, a) => sum + (a.reward || 0), 0);
            
        return { totalPossible, earnedCount, percent, totalDucks };
    }, [achievements, userAchievements]);

    const categories = useMemo(() => {
        const types = ['all', ...new Set(achievements.map(a => a.type))];
        return types.map(t => ({
            id: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
            count: t === 'all' ? achievements.length : achievements.filter(a => a.type === t).length
        }));
    }, [achievements]);

    const filteredAchievements = useMemo(() => {
        return achievements.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 a.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === 'all' || a.type === selectedType;
            return matchesSearch && matchesType;
        });
    }, [achievements, searchTerm, selectedType]);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'ducks': return <Coins size={14} />;
            case 'project': return <Briefcase size={14} />;
            case 'progress': return <TrendingUp size={14} />;
            case 'chat': return <MessageCircle size={14} />;
            case 'consistency': return <Activity size={14} />;
            case 'community': return <Users size={14} />;
            case 'session': return <Code size={14} />;
            case 'trade': return <Repeat size={14} />;
            case 'certificate': return <FileText size={14} />;
            default: return <Award size={14} />;
        }
    };

    if (isLoading) {
        return (
            <div className="achievements-page">
                <div className="ach-controls card">
                    <div className="header-container">
                        <Skeleton height="44px" width="44px" borderRadius="12px" />
                        <Skeleton height="44px" width="300px" />
                    </div>
                    <Skeleton height="40px" />
                </div>
                <div className="achievements-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="achievement-card locked">
                            <Skeleton height="120px" className="skeleton-card" />
                            <div className="ach-info">
                                <Skeleton height="20px" width="70%" className="skeleton-title" />
                                <Skeleton height="15px" width="90%" />
                                <Skeleton height="15px" width="40%" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="achievements-page">
            <div className="ach-controls card">
                <div className="ach-upper-controls">
                    <div className="ach-brand">
                        <Award size={32} />
                        <div>
                            <h1>Hall of Achievements</h1>
                            <p>Track your progress and earn badges.</p>
                        </div>
                    </div>

                    {stats && (
                        <div className="ach-global-stats">
                            <div className="ach-progress-info">
                                <span className="stat-text"><strong>{stats.earnedCount}</strong> / {stats.totalPossible} Badges</span>
                                <span className="percent">{stats.percent}%</span>
                            </div>
                            <div className="progress-track-outer">
                                <div className="progress-fill-outer" style={{ width: `${stats.percent}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="ach-lower-controls">
                    <div className="search-box">
                        <Search size={20} />
                        <input 
                            type="text" 
                            placeholder="Search badges..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-scroll">
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                className={`filter-chip ${selectedType === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedType(cat.id)}
                            >
                                {cat.label}
                                <span className="count">{cat.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="achievements-grid">
                {filteredAchievements.length > 0 ? (
                    filteredAchievements.map((ach) => {
                        const isEarned = userAchievements.includes(ach.id);
                        return (
                            <div key={ach.id} className={`achievement-card ${isEarned ? 'earned' : 'locked'}`}>
                                <div className="badge-wrapper">
                                    <div className={`badge badge-${ach.slug}`}>&nbsp;</div>
                                    {!isEarned && (
                                        <div className="lock-overlay">
                                            <Lock size={32} />
                                        </div>
                                    )}
                                </div>

                                <div className="ach-info">
                                    <div className="ach-type-badge">
                                        {getTypeIcon(ach.type)}
                                        <span>{ach.type}</span>
                                    </div>
                                    <h3 className="achievement-name">{ach.name}</h3>
                                    <p className="achievement-desc">{ach.description}</p>
                                    
                                    <div className="ach-reward">
                                        <Coins size={14} />
                                        <span>+{ach.reward} Ducks</span>
                                    </div>
                                </div>

                                {isEarned ? (
                                    <div className="earned-check">
                                        <Shield size={16} />
                                        <span>Earned</span>
                                    </div>
                                ) : (
                                    ach.type !== 'certificate' && (
                                        <div className="ach-card-progress">
                                            <div className="progress-info">
                                                <span>{ach.current_progress} / {ach.requirement_value}</span>
                                            </div>
                                            <div className="progress-track-mini">
                                                <div 
                                                    className="progress-fill-mini" 
                                                    style={{ width: `${Math.min(100, (ach.current_progress / ach.requirement_value) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-achievements">
                        <Search size={48} />
                        <h3>No matches found</h3>
                        <p>Try adjusting your search or filters to find more badges.</p>
                        <button className="text-btn" onClick={() => { setSearchTerm(''); setSelectedType('all'); }}>Clear all filters</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Achievements;

