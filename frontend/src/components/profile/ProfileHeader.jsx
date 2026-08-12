import React from 'react';
import { Link } from 'react-router-dom';
import { User, History } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import { formatLargeNumber } from '../../utils/formatters';
import { getApiUrl } from '../../utils/apiUrl';

const ProfileHeader = ({ target, isOwner, pfpInputRef, onPfpChange, editLink }) => {
    const borderSpeed = target.animated_border_speed === 'slow' ? '3s' : target.animated_border_speed === 'fast' ? '0.5s' : '1.5s';
    return (
        <div className="profile-header-card">
            <div 
                className={`header-background ${target.has_custom_wallpaper ? 'custom-banner' : ''}`}
                style={target.has_custom_wallpaper && target.profile_wallpaper ? {
                    backgroundImage: `url(${target.profile_wallpaper.startsWith('http') ? target.profile_wallpaper : getApiUrl('/user/profile_wallpapers/' + target.profile_wallpaper)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {}}
            ></div>
            <div className="profile-header-content">
                <div role="button" tabIndex={0} 
                    className={`avatar-wrapper ${target.has_animated_border ? 'perk-animated-border' : ''}`} 
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => isOwner && pfpInputRef.current?.click()}
                    style={target.has_animated_border ? { 
                        '--border-speed': borderSpeed,
                        ...(target.animated_border_color ? { '--border-color': target.animated_border_color } : {})
                    } : {}}
                >
                    <SmartImage 
                        src={getApiUrl(target.profile_picture_url)} 
                        alt={target.username} 
                        className="avatar-img"
                        fallbackType="avatar"
                    />
                    {isOwner && (
                        <>
                            <div className="upload-overlay">
                                <span>Change Photo</span>
                            </div>
                            <input 
                                type="file" 
                                ref={pfpInputRef} 
                                hidden 
                                accept="image/*" 
                                onChange={onPfpChange} 
                            />
                        </>
                    )}
                </div>

                <div className="student-identity">
                    <h1 className="student-name">{target.nickname || target.username}</h1>
                    <p className="student-title">@{target.username}</p>
                    {target.current_activity && (
                        <p className="student-activity mt-sm text-sm text-secondary">
                            <span className="activity-dot"></span>
                            {target.current_activity}
                        </p>
                    )}
                    {isOwner && (
                        <div className="profile-header-actions">
                            <Link to={editLink || "/settings"} className="btn-settings">
                                <User size={14} /> Edit Profile
                            </Link>
                            <Link to="/activity" className="btn-settings">
                                <History size={14} /> Activity
                            </Link>
                        </div>
                    )}
                </div>

                <div className="header-stats">
                    <div className="stat-box">
                        <span className="label">Levels</span>
                        <span className="value">{target.total_levels || 0}</span>
                    </div>
                    
                    <div className="stat-divider"></div>

                    <div className="stat-box">
                        <span className="label">Projects</span>
                        <span className="value">{target.projects?.length || 0}</span>
                    </div>
                    
                    {target.role !== 'parent' && (
                        <>
                            <div className="stat-divider"></div>

                            <div className="stat-box highlight" title={target.earned_ducks?.toLocaleString()}>
                                <span className="label">Lifetime</span>
                                <span className="value">{formatLargeNumber(target.earned_ducks)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileHeader;
