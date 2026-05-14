import React, { useMemo } from 'react';
import { 
    Search, 
    PlusCircle, 
    Hash, 
    X, 
    User as UserIcon, 
    MessageSquare, 
    Shield,
    Award,
    FileCheck,
    Zap,
    RefreshCw,
    Disc,
    LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

import ChatSidebarFooter from './ChatSidebarFooter';

const ChatSidebar = ({ 
    user, 
    isSidebarOpen, 
    setSidebarOpen, 
    searchTerm, 
    setSearchTerm, 
    conversations, 
    activeConversation, 
    handleSelectConversation, 
    setIsModalOpen,
    formatConversationTitle,
    globalConversation,        // The canonical global/announcements conv object
}) => {
    const { logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const filteredConversations = useMemo(() => {
        const searchLower = (searchTerm || '').trim().toLowerCase();
        if (!searchLower) return conversations;

        const results = conversations.filter(conv => {
            // Match title
            const titleMatch = (conv.title || '').toLowerCase().includes(searchLower);
            
            // Match formatted title
            const formattedTitleMatch = formatConversationTitle(conv.title).toLowerCase().includes(searchLower);
            
            // Match any message content
            const messageMatch = conv.messages?.some(msg => 
                (msg.content || '').toLowerCase().includes(searchLower)
            );
            
            // Match any participant name (including sender attribution)
            const participantMatch = conv.messages?.some(msg => 
                (msg.nickname || '').toLowerCase().includes(searchLower) || 
                (msg.username || '').toLowerCase().includes(searchLower)
            );
            
            return titleMatch || formattedTitleMatch || messageMatch || participantMatch;
        });

        console.debug(`[ChatSearch] Term: "${searchLower}", Results: ${results.length}/${conversations.length}`);
        return results;
    }, [conversations, searchTerm, formatConversationTitle]);

    return (
        <>
            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
                onClick={() => setSidebarOpen(false)}
            ></div>

            <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-header-top">
                        <h2>Messages</h2>
                        <div className="sidebar-actions">
                            <button 
                                className="mobile-menu-toggle"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <X size={20} />
                            </button>

                            {user?.is_admin && (
                                <button 
                                    onClick={() => setIsModalOpen(true)}
                                    className="add-conv-btn"
                                    title="New Conversation"
                                >
                                    <PlusCircle size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="search-container">
                        <input 
                            type="text" 
                            placeholder="Search conversations..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={16} className="search-icon" />
                    </div>
                </div>

                <div className="conversations-list">
                    {/* ---- Pinned Global Announcements entry ---- */}
                    {globalConversation && (
                        <div
                            id="sidebar-announcements-pin"
                            onClick={() => handleSelectConversation(globalConversation)}
                            className={`conversation-item pinned-announcement ${
                                activeConversation?.conversation_id === globalConversation.conversation_id
                                    ? 'active'
                                    : ''
                            }`}
                        >
                            <div className="conv-icon-container" style={{ background: 'var(--accent-subtle, rgba(99,102,241,0.15))', borderRadius: '10px' }}>
                                <span style={{ fontSize: '20px', lineHeight: 1 }}>📢</span>
                            </div>
                            <div className="conv-info">
                                <div className="conv-title-row">
                                    <h4 className="conv-title" style={{ color: 'var(--primary-color)', fontWeight: 700 }}>
                                        Announcements
                                    </h4>
                                    <span className="conv-date" style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>pinned</span>
                                </div>
                                <p className="conv-last-msg">
                                    {globalConversation.messages?.[globalConversation.messages.length - 1]?.content || 'Instructor announcements'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ---- Classroom conversations ---- */}
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                            <div 
                                key={conv.conversation_id} 
                                onClick={() => handleSelectConversation(conv)}
                                className={`conversation-item ${activeConversation?.conversation_id === conv.conversation_id ? 'active' : ''}`}
                            >
                                <div className="conv-icon-container">
                                    <Hash size={24} />
                                </div>
                                <div className="conv-info">
                                    <div className="conv-title-row">
                                        <h4 className="conv-title">
                                            {formatConversationTitle(conv.title)}
                                        </h4>
                                        <span className="conv-date">
                                            {conv.messages?.[conv.messages.length - 1]?.timestamp ? 
                                                new Date(conv.messages[conv.messages.length - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 
                                                ''}
                                        </span>
                                    </div>
                                    <p className="conv-last-msg">
                                        {conv.messages?.[conv.messages.length - 1]?.content || 'No messages yet'}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-search">
                            <p>No conversations found</p>
                        </div>
                    )}
                </div>

                <ChatSidebarFooter 
                    user={user} 
                    onAction={() => setSidebarOpen(false)} 
                    onLogout={handleLogout} 
                />
            </aside>
        </>
    );
};

export default ChatSidebar;
