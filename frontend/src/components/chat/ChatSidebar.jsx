import React from 'react';
import { Search, PlusCircle, Hash, X, User as UserIcon, MessageSquare, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    formatConversationTitle 
}) => {
    const filteredConversations = conversations.filter(conv => {
        const searchLower = (searchTerm || '').toLowerCase();
        if (!searchLower) return true;

        // Match title
        const titleMatch = (conv.title || 'Conversation').toLowerCase().includes(searchLower);
        
        // Match formatted title
        const formattedTitleMatch = formatConversationTitle(conv.title).toLowerCase().includes(searchLower);
        
        // Match any message content
        const messageMatch = conv.messages?.some(msg => 
            (msg.content || '').toLowerCase().includes(searchLower)
        );
        
        // Match any participant name
        const participantMatch = conv.messages?.some(msg => 
            (msg.nickname || '').toLowerCase().includes(searchLower) || 
            (msg.username || '').toLowerCase().includes(searchLower)
        );
        
        return titleMatch || formattedTitleMatch || messageMatch || participantMatch;
    });

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

                <div className="chat-sidebar-footer mobile-only">
                    <Link to="/profile" className="sidebar-footer-item"><UserIcon size={18} /> Profile</Link>
                    <Link to="/history" className="sidebar-footer-item"><MessageSquare size={18} /> History</Link>
                    {user?.is_admin && <Link to="/admin" className="sidebar-footer-item"><Shield size={18} /> Admin</Link>}
                </div>
            </aside>
        </>
    );
};

export default ChatSidebar;
