import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import { formatLargeNumber } from '../../utils/formatters';
import { getApiUrl } from '../../utils/apiUrl';

const ProfileHeader = ({ target, isOwner, pfpInputRef, onPfpChange }) => {
    return (
        <div className="profile-header-card">
            <div 
                className="header-background"
                style={target.has_custom_wallpaper && target.profile_wallpaper ? {
                    backgroundImage: `url(${target.profile_wallpaper})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {}}
            ></div>
            <div className="profile-header-content">
                <div className="avatar-wrapper" onClick={() => isOwner && pfpInputRef.current?.click()}>
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
                    {isOwner && (
                        <Link to="/settings" className="btn-settings">
                            <User size={14} /> Edit Profile
                        </Link>
                    )}
                </div>

                <div className="header-stats">
                    {target.role !== 'parent' && (
                        <>
                            <div className="stat-box" title={target.duck_balance?.toLocaleString()}>
                                <span className="label">Ducks</span>
                                <span className="value">{formatLargeNumber(target.duck_balance)}</span>
                            </div>
                            
                            <div className="stat-divider"></div>
                        </>
                    )}

                    <div className="stat-box">
                        <span className="label">Levels</span>
                        <span className="value">{target.total_levels || 0}</span>
                    </div>
                    
                    <div className="stat-divider"></div>

                    <div className="stat-box">
                        <span className="label">Projects</span>
                        <span className="value">{target.projects?.length || 0}</span>
                    </div>
                    
                    {target.role !== 'parent' && target.packets > 0 && (
                        <>
                            <div className="stat-divider"></div>
                            <div className="stat-box" title={target.packets.toLocaleString()}>
                                <span className="label">Packets</span>
                                <span className="value">{formatLargeNumber(target.packets)}</span>
                            </div>
                        </>
                    )}
                    
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
