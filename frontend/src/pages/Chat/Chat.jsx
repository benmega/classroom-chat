import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical, 
  User as UserIcon, 
  MessageSquare,
  Clock,
  PlusCircle,
  Hash,
  X,
  Menu,
  Shield
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import './Chat.css';

import SmartImage from '../../components/common/SmartImage';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import useChatSocket from '../../hooks/useChatSocket';
import Linkify from '../../components/common/Linkify';


const formatConversationTitle = (title) => {
  if (!title) return 'Conversation';
  if (title.startsWith('Conversation started by User') && title.includes(' at ')) {
    const parts = title.split(' at ');
    if (parts.length >= 2) {
      const datePart = parts[1].split('.')[0];
      const date = new Date(datePart.replace(' ', 'T')); // Standardize for JS Date
      if (!isNaN(date)) {
        return `Chat on ${date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}`;
      }
    }
  }
  return title;
};

const Chat = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();


  const onMessageReceived = useCallback((data) => {
    setConversations(prevConvs => {
      let updated = false;
      const nextConvs = prevConvs.map(conv => {
        if (conv.conversation_id === data.conversation_id) {
          const msgExists = conv.messages?.some(m => 
            (m.content === data.content && m.username === data.username && Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 1000)
          );
          if (msgExists) return conv;
          updated = true;
          return {
            ...conv,
            messages: [...(conv.messages || []), data]
          };
        }
        return conv;
      });
      return updated ? nextConvs : prevConvs;
    });

    setMessages(prev => {
      const exists = prev.some(m => 
        (m.content === data.content && m.username === data.username && Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 1000)
      );
      if (exists) return prev;
      
      // Ensure we only add the message to the active view if it belongs there
      if (prev.length > 0 && prev[0].conversation_id && prev[0].conversation_id !== data.conversation_id) {
         return prev;
      }
      return [...prev, data];
    });
  }, []);

  const { sendMessage } = useChatSocket(onMessageReceived);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;
      try {
        const response = await client.get(`/message/api/conversations/${user.id}`);
        // Assuming it's wrapped in { status, data, error } by the api_response decorator
        const historyData = response.data.data || response.data; 
        setConversations(historyData);
        if (historyData.length > 0) {
          setActiveConversation(historyData[0]);
          setMessages(historyData[0].messages || []);
        }
      } catch {
        console.error('Failed to load conversation history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  useEffect(() => {
    if (conversations.length > 0) {
      const params = new URLSearchParams(location.search);
      const convId = params.get('conv');
      if (convId) {
        const targetConv = conversations.find(c => c.conversation_id === parseInt(convId));
        if (targetConv) {
          setActiveConversation(targetConv);
          setMessages(targetConv.messages || []);
        }
      }
    }
  }, [location.search, conversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    // Use Socket.io to send the message
    sendMessage({
      content: newMessage,
      conversation_id: activeConversation.conversation_id
    });

    setNewMessage('');
  };


  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setMessages(conv.messages || []);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };


  const handleCreateConversation = async (e) => {
    e.preventDefault();
    if (!newConversationTitle.trim()) return;

    setIsCreating(true);
    try {
      const response = await client.post('/message/start_conversation', {
        title: newConversationTitle
      });
      
      const newConv = {
        conversation_id: response.data.conversation_id,
        title: response.data.title,
        messages: []
      };

      setConversations(prev => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
      setIsModalOpen(false);
      setNewConversationTitle('');
      toast.success('Conversation created!');
    } catch (err) {
      toast.error('Failed to create conversation');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>;

  return (
    <div className="chat-container">
      {/* Sidebar Overlay (Mobile) */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
             <h2 style={{ fontSize: 'var(--font-xl)' }}>Messages</h2>
             <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="mobile-menu-toggle"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={20} />
                </button>

                {user?.is_admin && (
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <PlusCircle size={20} />
                  </button>
                )}
             </div>
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px 8px 36px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)',
                fontSize: 'var(--font-sm)'
              }} 
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations
            .filter(conv => (conv.title || 'Conversation').toLowerCase().includes(searchTerm.toLowerCase()))
            .length > 0 ? (
            conversations
              .filter(conv => (conv.title || 'Conversation').toLowerCase().includes(searchTerm.toLowerCase()))
              .map((conv) => (
                <div 
                  key={conv.conversation_id} 
                  onClick={() => handleSelectConversation(conv)}
                  style={{ 
                    padding: '0.75rem 1rem', 
                    cursor: 'pointer',
                    background: activeConversation?.conversation_id === conv.conversation_id ? 'var(--bg-tertiary)' : 'transparent',
                    borderLeft: activeConversation?.conversation_id === conv.conversation_id ? '4px solid var(--primary-color)' : '4px solid transparent',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: '10px'
                  }}
                >
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: 'var(--accent-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    opacity: 0.15
                  }}>
                    <Hash size={24} color="var(--accent-color)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                       <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                         {formatConversationTitle(conv.title)}
                       </h4>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                         {conv.messages?.[conv.messages.length - 1]?.timestamp ? 
                           new Date(conv.messages[conv.messages.length - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 
                           ''}
                       </span>
                     </div>
                     <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                       {conv.messages?.[conv.messages.length - 1]?.content || 'No messages yet'}
                     </p>
                  </div>
                </div>
              ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.875rem' }}>No conversations found</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer (Navigation links for mobile) */}
        <div className="chat-sidebar-footer mobile-only">
          <Link to="/profile" className="sidebar-footer-item"><UserIcon size={18} /> Profile</Link>
          <Link to="/history" className="sidebar-footer-item"><MessageSquare size={18} /> History</Link>
          {user?.is_admin && <Link to="/admin" className="sidebar-footer-item"><Shield size={18} /> Admin</Link>}
        </div>
      </aside>

      {/* Chat Window */}
      <div className="chat-window">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button 
                    className="hamburger-toggle" 
                    onClick={toggleSidebar}
                    aria-label="Toggle Sidebar"
                  >
                    <Menu size={24} />
                  </button>
                  <div className="header-icon-container" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Hash size={20} color="var(--primary-color)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{formatConversationTitle(activeConversation.title)}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}>Active Now</p>
                  </div>
                </div>
                {/* Search, Clock, and MoreVertical buttons removed as they are currently non-functional */}

              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="chat-messages"
            >
              <div className="chat-messages-inner">
                {messages.map((msg, index) => {
                  const isUser = msg.user_id === user.id;
                  return (
                    <div 
                      key={msg.id || index} 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        gap: '4px',
                        minWidth: 0,
                        width: '100%'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                      <Link 
                        to={msg.slug ? `/profile/${msg.slug}` : '#'} 
                        style={{ 
                          textDecoration: 'none', 
                          cursor: msg.slug ? 'pointer' : 'default',
                          display: 'flex'
                        }}
                      >
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '8px', 
                          background: msg.is_ai ? 'var(--highlight-hover)' : 'var(--bg-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          overflow: 'hidden'
                        }}>
                          {msg.user_profile_pic ? (
                            <SmartImage 
                              src={`/user/profile_pictures/${msg.user_profile_pic}`} 
                              alt={msg.nickname} 
                              style={{ width: '100%', height: '100%' }} 
                              fallbackType="avatar"
                            />
                          ) : (
                            <UserIcon size={16} />
                          )}
                        </div>
                      </Link>
                        <div style={{ 
                          maxWidth: 'min(80%, 650px)',
                          padding: '0.6rem 1rem',
                          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          background: isUser ? 'var(--primary-color)' : 'var(--bg-primary)',
                          color: isUser ? 'white' : 'var(--text-primary)',
                          boxShadow: 'var(--shadow-sm)',
                           fontSize: 'var(--font-md)',
                          lineHeight: '1.5',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word'
                        }}>
                          <Linkify text={msg.content} isUserMessage={isUser} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: isUser ? '0 40px 0 0' : '0 0 0 40px' }}>
                        {msg.nickname || 'Unknown'} • {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message Input */}
            <div className="chat-input-area">
              <div className="chat-input-content">
                <form 
                  onSubmit={handleSendMessage}
                  className="chat-input-form"
                >
                  {/* Attachment functionality not yet implemented - icon removed to reduce distraction */}

                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..." 
                    className="chat-input-field"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="chat-send-btn"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative' }}>
             <div style={{ 
               width: '80px', 
               height: '80px', 
               borderRadius: '24px', 
               background: 'var(--bg-tertiary)', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               marginBottom: '1.5rem'
             }}>
               <MessageSquare size={40} />
             </div>

             <h2 style={{ color: 'var(--text-primary)' }}>Welcome to ClassroomChat</h2>
             <p>Select a conversation from the sidebar to start chatting.</p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            padding: '2rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>New Conversation</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateConversation}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Conversation Title
                </label>
                <input 
                  type="text" 
                  value={newConversationTitle}
                  onChange={(e) => setNewConversationTitle(e.target.value)}
                  placeholder="e.g. # General, # Homework-Help" 
                  autoFocus
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none'
                  }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ 
                    flex: 1,
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle)',
                    background: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !newConversationTitle.trim()}
                  style={{ 
                    flex: 2,
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: 'none',
                    background: 'var(--primary-color)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: (isCreating || !newConversationTitle.trim()) ? 0.6 : 1
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create Conversation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
