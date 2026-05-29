import React from 'react';
import { Link } from 'react-router-dom';
import { User as UserIcon, Trash2 } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import Linkify from '../common/Linkify';
import { getApiUrl } from '../../utils/apiUrl';

const ChatMessage = ({ msg, user, onDelete }) => {
    const isUser = msg.user_id === user.id;
    return (
        <div className={`chat-message-group ${isUser ? 'user' : 'other'}`}>
            <div className="message-row">
                <Link 
                    to={msg.slug ? `/profile/${msg.slug}` : '#'} 
                    className="avatar-link"
                >
                    <div className={`avatar-container ${msg.is_ai ? 'ai-avatar' : ''}`}>
                        {msg.user_profile_pic ? (
                            <SmartImage 
                                src={getApiUrl(`/user/profile_pictures/${msg.user_profile_pic}`)} 
                                alt={msg.nickname} 
                                fallbackType="avatar"
                            />
                        ) : (
                            <UserIcon size={20} />
                        )}
                    </div>
                </Link>
                <div className="message-content-wrapper">
                    <div className="message-header">
                        <span className="message-author">{msg.nickname || 'Unknown'}</span>
                        <span className="chat-message-timestamp">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                        <div className="message-bubble">
                            <Linkify text={msg.content} isUserMessage={isUser} />
                        </div>
                        {user?.is_admin && (
                            <button 
                                onClick={() => onDelete(msg.id)}
                                className="delete-message-btn"
                                title="Delete Announcement/Message"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;
