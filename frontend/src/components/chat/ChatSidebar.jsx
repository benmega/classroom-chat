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
    hasMoreConversations,
    isLoadingMoreConversations,
    handleLoadMoreConversations,
}) => {
    const { logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
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
                            placeholder="Search..." 
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
                            onClick={() => {
                                handleSelectConversation(globalConversation);
                                setSidebarOpen(false);
                            }}
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
                    <div style={{ padding: '0 1rem', marginTop: '1rem', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                            <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Class Spaces
                            </h3>
                        </div>
                    </div>
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                            <div 
                                key={conv.conversation_id} 
                                onClick={() => {
                                    handleSelectConversation(conv);
                                    setSidebarOpen(false);
                                }}
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
                    {hasMoreConversations && (
                        <div className="load-more-container" style={{ padding: '0.75rem var(--spacing-md, 1rem)', display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={handleLoadMoreConversations}
                                disabled={isLoadingMoreConversations}
                                className="btn-load-more"
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s ease',
                                    boxShadow: 'var(--shadow-sm)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-secondary)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                }}
                            >
                                {isLoadingMoreConversations ? (
                                    <>
                                        <span className="spinner-loader" style={{
                                            width: '14px',
                                            height: '14px',
                                            border: '2px solid var(--text-secondary)',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            display: 'inline-block',
                                            animation: 'spin 0.8s linear infinite',
                                        }}></span>
                                        Loading...
                                    </>
                                ) : (
                                    'Load More'
                                )}
                            </button>
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
