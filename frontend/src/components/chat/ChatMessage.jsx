import React from 'react';
import { Link } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import SmartImage from '../common/SmartImage';
import Linkify from '../common/Linkify';

const ChatMessage = ({ msg, user }) => {
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
                                src={`/user/profile_pictures/${msg.user_profile_pic}`} 
                                alt={msg.nickname} 
                                fallbackType="avatar"
                            />
                        ) : (
                            <UserIcon size={20} />
                        )}
                    </div>
                </Link>
                <div className="message-bubble">
                    <Linkify text={msg.content} isUserMessage={isUser} />
                </div>
            </div>
            <span className="chat-message-timestamp">
                {msg.nickname || 'Unknown'} • {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </span>
        </div>
    );
};

export default ChatMessage;
