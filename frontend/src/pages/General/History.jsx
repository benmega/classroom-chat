import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MessageSquare, 
    Calendar, 
    ArrowRight, 
    Search,
    Clock,
    User
} from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import Skeleton from '../../components/common/Skeleton';
import './History.css';

const History = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user?.id) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await client.get(`/message/api/conversations/${user.id}`);
                const historyData = response.data.data || response.data;
                setConversations(historyData);
            } catch (err) {
                console.error('Failed to load history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const formatTitle = (title) => {
        if (!title) return 'Untitled Conversation';
        if (title.startsWith('Conversation started by User') && title.includes(' at ')) {
            const parts = title.split(' at ');
            if (parts.length >= 2) {
                const datePart = parts[1].split('.')[0];
                const date = new Date(datePart.replace(' ', 'T'));
                if (!isNaN(date)) {
                    return `Chat from ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
                }
            }
        }
        return title;
    };

    const filteredConversations = conversations.filter(conv => 
        (conv.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.messages?.[conv.messages.length - 1]?.content || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="history-page container">
                <div className="history-header glass-panel">
                    <Skeleton height="40px" width="300px" className="skeleton-title" />
                    <Skeleton height="20px" width="450px" />
                </div>
                <div className="history-list">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="history-card" style={{ cursor: 'default' }}>
                            <div className="card-icon">
                                <Skeleton height="24px" width="24px" borderRadius="50%" />
                            </div>
                            <div className="card-content" style={{ flex: 1 }}>
                                <Skeleton height="20px" width="60%" className="skeleton-title" />
                                <Skeleton height="16px" width="90%" />
                                <Skeleton height="14px" width="30%" style={{ marginTop: '10px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="history-page container animate-fade-in">
            <div className="history-header glass-panel">
                <div className="header-info">
                    <h1>Activity History</h1>
                    <p>Track your past conversations and classroom interactions.</p>
                </div>
                <div className="search-bar">
                    <Search size={20} />
                    <input 
                        type="text" 
                        placeholder="Search conversations..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="history-stats">
                <div className="stat-card glass-panel">
                    <MessageSquare size={24} />
                    <div className="stat-value">{conversations.length}</div>
                    <div className="stat-label">Total Chats</div>
                </div>
                <div className="stat-card glass-panel">
                    <Clock size={24} />
                    <div className="stat-value">
                        {conversations.length > 0 ? 
                            new Date(conversations[0].messages?.[0]?.timestamp || Date.now()).toLocaleDateString() : 
                            'N/A'}
                    </div>
                    <div className="stat-label">Latest Activity</div>
                </div>
            </div>

            <div className="history-list">
                {filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => (
                        <div key={conv.conversation_id} className="history-card" onClick={() => navigate(`/chat?conv=${conv.conversation_id}`)}>
                            <div className="card-icon">
                                <MessageSquare size={24} />
                            </div>
                            <div className="card-content">
                                <h3>{formatTitle(conv.title)}</h3>
                                <p className="last-message">
                                    {conv.messages?.[conv.messages.length - 1]?.content || 'No messages yet'}
                                </p>
                                <div className="card-meta">
                                    <span className="date">
                                        <Calendar size={14} />
                                        {new Date(conv.messages?.[0]?.timestamp || Date.now()).toLocaleDateString()}
                                    </span>
                                    <span className="participants">
                                        <User size={14} />
                                        {conv.messages_count !== undefined ? conv.messages_count : (conv.messages?.length || 0)} messages
                                    </span>
                                </div>
                            </div>
                            <div className="card-action">
                                <ArrowRight size={20} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-history card-premium">
                        <MessageSquare size={48} />
                        <h3>No Conversations Found</h3>
                        <p>You haven't participated in any conversations yet or your search matched nothing.</p>
                        <button onClick={() => navigate('/chat')} className="btn-premium">Start a Conversation</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
