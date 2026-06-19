import React from 'react';
import { Link } from 'react-router-dom';
import { User as UserIcon, Trash2, Globe, Radio, Users, UserPlus } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import Linkify from '../common/Linkify';
import { getApiUrl } from '../../utils/apiUrl';

const ChatMessage = React.memo(({ msg, user, onDelete }) => {
    return (
        <div className="chat-message-group">
            <div className="message-row">
                <Link 
                    to={msg.slug ? `/profile/${msg.slug}` : '#'} 
                    className="avatar-link"
                >
                    <div className={`avatar-container ${msg.has_animated_border ? "perk-animated-border" : ""}`}>
                        {msg.user_profile_pic ? (
                            <SmartImage 
                                src={getApiUrl(`/user/profile_pictures/${msg.user_profile_pic}`)} 
                                alt={msg.user_name || 'User'} 
                                fallbackType="avatar"
                            />
                        ) : (
                            <UserIcon size={20} />
                        )}
                    </div>
                </Link>
                <div className="message-content-wrapper">
                    <div className="message-header">
                        <span className="message-author">{msg.user_name || 'Unknown'}</span>
                        
                        <div className="message-targeting-info">
                            {msg.is_global && (
                                <Globe size={12} color="var(--primary-color)" style={{ marginTop: '2px' }} title="Global Post" />
                            )}
                            
                            {(user?.is_admin || user?.id === msg.user_id) && !msg.is_global && (
                                <>
                                    {msg.target_live && (
                                        <span className="targeting-badge">
                                            <Radio size={10} /> Live
                                        </span>
                                    )}
                                    {msg.target_classrooms?.length === 1 ? (
                                        <span className="targeting-badge">
                                            <Users size={10} /> {msg.target_classrooms[0]}
                                        </span>
                                    ) : msg.target_classrooms?.length > 1 ? (
                                        <span className="targeting-badge" title={msg.target_classrooms.join(', ')}>
                                            <Users size={10} /> {msg.target_classrooms.length} Classes
                                        </span>
                                    ) : null}

                                    {msg.target_users?.length === 1 ? (
                                        <span className="targeting-badge user-badge">
                                            <UserPlus size={10} /> {msg.target_users[0]}
                                        </span>
                                    ) : msg.target_users?.length > 1 ? (
                                        <span className="targeting-badge user-badge" title={msg.target_users.join(', ')}>
                                            <UserPlus size={10} /> {msg.target_users.length} Students
                                        </span>
                                    ) : null}
                                </>
                            )}
                        </div>

                        <span className="chat-message-timestamp">
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, width: '100%' }}>
                        <div className={`message-bubble ${msg.chat_font_color ? "perk-chat-font" : ""}`} style={{ flex: 1, minWidth: 0, ...(msg.chat_font_color ? { "--chat-font-color": msg.chat_font_color } : {}) }}>
                            <Linkify text={msg.content} isUserMessage={false} />
                        </div>
                        {user?.is_admin && (
                            <button 
                                onClick={() => onDelete(msg.id)}
                                className="delete-message-btn"
                                title="Delete Post"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ChatMessage;
