import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Send, 
  MessageSquare,
  Hash,
  Menu,
  Smile,
  X,
  Settings,
  Lock,
  Clock,
  Trash2
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import useSidebar from '../../hooks/useSidebar';
import './Chat.css';

import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import useChatSocket from '../../hooks/useChatSocket';
import { GLOBAL_CLASSROOM_ID } from '../../utils/constants';

// Extracted Components
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatMessage from '../../components/chat/ChatMessage';

const formatConversationTitle = (title) => {
  if (!title) return 'Conversation';
  if (title.startsWith('Conversation started by User') && title.includes(' at ')) {
    const parts = title.split(' at ');
    if (parts.length >= 2) {
      const datePart = parts[1].split('.')[0];
      const date = new Date(datePart.replace(' ', 'T'));
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
  const textareaRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const [globalConversationId, setGlobalConversationId] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');

  // Editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [editSlowMode, setEditSlowMode] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const onMessageReceived = useCallback((data) => {
    // Only append if the message belongs to the active conversation
    // OR it is a global announcement and the global conv is active.
    setConversations(prevConvs => {
      let updated = false;
      const nextConvs = prevConvs.map(conv => {
        if (conv.conversation_id === data.conversation_id) {
          const msgExists = conv.messages?.some(m => m.id === data.id);
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
      const exists = prev.some(m => m.id === data.id);
      if (exists) return prev;

      // Scope: only append to the currently viewed conversation
      if (prev.length > 0 && prev[0]?.conversation_id && prev[0].conversation_id !== data.conversation_id) {
        return prev;
      }
      return [...prev, data];
    });
  }, []);

  // Fetch conversation history and optionally set the active conversation
  const fetchHistory = useCallback(async (defaultConvId = null) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const response = await client.get(`/message/api/conversations/${user.id}`);
      const historyData = response.data.data || response.data;
      setConversations(historyData);

      // If a defaultConvId is provided, open that conversation immediately
      if (defaultConvId) {
        const target = historyData.find(
          c => c.conversation_id === defaultConvId
        );
        if (target) {
          setActiveConversation(target);
          setMessages(target.messages || []);
        }
      }
    } catch {
      console.error('Failed to load conversation history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handler: student was enrolled in a new classroom via challenge submission
  const onClassroomEnrolled = useCallback((data) => {
    const classroom = data?.classroom;
    if (!classroom) return;
    toast.success(`You've been enrolled in "${classroom.name}"!`);
    // Refresh conversation list to include the new classroom's conversations
    fetchHistory();
  }, [fetchHistory]);

  const onConversationCreated = useCallback((data) => {
    setConversations(prev => {
      if (prev.some(c => c.conversation_id === data.conversation_id)) return prev;
      return [data, ...prev];
    });
  }, []);

  const onConversationUpdated = useCallback((data) => {
    setConversations(prev => prev.map(c => 
      c.conversation_id === data.conversation_id ? { ...c, ...data } : c
    ));
    if (activeConversation?.conversation_id === data.conversation_id) {
      setActiveConversation(prev => prev ? ({ ...prev, ...data }) : null);
    }
  }, [activeConversation]);

  const onConversationDeleted = useCallback((data) => {
    setConversations(prev => prev.filter(c => c.conversation_id !== data.conversation_id));
    if (activeConversation?.conversation_id === data.conversation_id) {
      setActiveConversation(null);
      setMessages([]);
      toast.error('This conversation was deleted by an admin.');
    }
  }, [activeConversation]);

  const { sendMessage } = useChatSocket(onMessageReceived, onClassroomEnrolled, {
    onConversationCreated,
    onConversationUpdated,
    onConversationDeleted
  });


  useEffect(() => {
    const initChat = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        // 1. Fetch context: enrolled classrooms + global conversation ID
        const ctxRes = await client.get('/message/api/me/context');
        const ctx = ctxRes.data;
        const globalConvId = ctx.global_conversation_id;
        setGlobalConversationId(globalConvId);
        setClassrooms(ctx.classrooms || []);
        
        // Default the classroom selection to the first available non-global classroom if any
        const firstClassroom = (ctx.classrooms || []).find(c => c.id !== GLOBAL_CLASSROOM_ID);
        if (firstClassroom) setSelectedClassroomId(firstClassroom.id);

        // 2. Fetch conversations, defaulting to the global feed
        await fetchHistory(globalConvId);
      } catch {
        // Fallback: just load history without setting a default
        await fetchHistory();
      }
    };

    initChat();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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

    sendMessage({
      content: newMessage.trim(),
      conversation_id: activeConversation.conversation_id
    });

    setNewMessage('');
    setShowEmojiPicker(false);
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setMessages(conv.messages || []);
  };

  const handleCreateConversation = async (e) => {
    e.preventDefault();
    if (!newConversationTitle.trim()) return;
    if (!selectedClassroomId) {
      toast.error('Please select a classroom');
      return;
    }

    setIsCreating(true);
    try {
      const response = await client.post('/message/start_conversation', {
        title: newConversationTitle,
        classroom_id: selectedClassroomId
      });
      
      const newConv = {
        conversation_id: response.data.conversation_id,
        title: response.data.title,
        classroom_id: response.data.classroom_id,
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

  const openEditModal = () => {
    if (!activeConversation) return;
    setEditTitle(activeConversation.title || '');
    setEditIsLocked(activeConversation.is_locked || false);
    setEditSlowMode(activeConversation.slow_mode_delay || 0);
    setIsEditModalOpen(true);
  };

  const handleUpdateConversation = async (e) => {
    e.preventDefault();
    if (!activeConversation) return;

    setIsUpdating(true);
    try {
      const response = await client.post('/message/update_conversation', {
        conversation_id: activeConversation.conversation_id,
        title: editTitle,
        is_locked: editIsLocked,
        slow_mode_delay: editSlowMode
      });

      if (response.data.success) {
        const updatedConv = {
          ...activeConversation,
          title: editTitle,
          is_locked: editIsLocked,
          slow_mode_delay: editSlowMode
        };

        setConversations(prev => prev.map(c => 
          c.conversation_id === updatedConv.conversation_id ? updatedConv : c
        ));
        setActiveConversation(updatedConv);
        setIsEditModalOpen(false);
        toast.success('Conversation updated!');
      }
    } catch (err) {
      toast.error('Failed to update conversation');
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConversation) return;
    if (!window.confirm('Are you sure you want to permanently delete this conversation and all its messages?')) return;

    try {
      await client.delete(`/message/delete_conversation/${activeConversation.conversation_id}`);
      
      setConversations(prev => prev.filter(c => c.conversation_id !== activeConversation.conversation_id));
      setActiveConversation(null);
      setMessages([]);
      setIsEditModalOpen(false);
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error('Failed to delete conversation');
      console.error(err);
    }
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>;

  return (
    <div className="chat-container">
      <ChatSidebar 
        user={user}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        conversations={conversations.filter(c => c.conversation_id !== globalConversationId)}
        activeConversation={activeConversation}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSelectConversation={handleSelectConversation}
        setIsModalOpen={setIsModalOpen}
        formatConversationTitle={formatConversationTitle}
        globalConversation={conversations.find(c => c.conversation_id === globalConversationId) || null}
      />

      <div className="chat-window">
        {activeConversation ? (
          <>
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

                {user?.is_admin && activeConversation.classroom_id !== GLOBAL_CLASSROOM_ID && (
                  <button 
                    onClick={openEditModal}
                    className="chat-icon-btn"
                    title="Manage Conversation"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </div>
            </div>

            <div 
              ref={scrollRef}
              className="chat-messages"
            >
              <div className="chat-messages-inner">
                {messages.map((msg, index) => (
                  <ChatMessage 
                    key={msg.id || index}
                    msg={msg}
                    user={user}
                  />
                ))}
              </div>
            </div>

            <div className="chat-input-area">
              <div className="chat-input-content">
                {/* ---- Input gate: global feed is read-only for non-admins ---- */}
                {activeConversation?.classroom_id === GLOBAL_CLASSROOM_ID && !user?.is_admin ? (
                  <p
                    id="global-feed-readonly-label"
                    style={{
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      padding: '0.75rem 1rem',
                      fontStyle: 'italic',
                      userSelect: 'none',
                    }}
                  >
                    Announcements are posted by instructors only.
                  </p>
                ) : (
                  <form
                    onSubmit={handleSendMessage}
                    className="chat-input-form"
                  >
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={handleTextareaChange}
                      onKeyDown={handleTextareaKeyDown}
                      placeholder="Type your message... (Shift+Enter for new line)"
                      className="chat-input-field"
                      rows={1}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', position: 'relative' }} ref={emojiPickerRef}>
                      <button
                        type="button"
                        className="chat-icon-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Add emoji"
                      >
                        <Smile size={20} color={showEmojiPicker ? "var(--primary-color)" : "var(--text-secondary)"} />
                      </button>

                      {showEmojiPicker && (
                        <div className="emoji-picker-container">
                          <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme="auto"
                            width={320}
                            height={400}
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="chat-send-btn"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative', padding: '2rem' }}>
             <button 
               className="hamburger-toggle welcome-toggle" 
               onClick={toggleSidebar}
               aria-label="Toggle Sidebar"
               style={{ position: 'absolute', top: '1.5rem', left: '1rem' }}
             >
               <Menu size={24} />
             </button>
             <div className="animate-float" style={{ 
               width: '100px', 
               height: '100px', 
               borderRadius: '30px', 
               background: 'var(--bg-tertiary)', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               marginBottom: '2rem',
               boxShadow: 'var(--shadow-lg)',
               border: '1px solid var(--border-subtle)'
             }}>
               <MessageSquare size={48} color="var(--primary-color)" />
             </div>

             <h2 style={{ 
               fontSize: 'clamp(1.25rem, 4vw, var(--font-4xl))', 
               fontWeight: 800, 
               letterSpacing: '-0.025em',
               lineHeight: 1.2,
               marginBottom: '1rem',
               background: 'var(--gradient-primary)',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               textAlign: 'center'
             }}>
               Welcome back, {user?.nickname || user?.username || 'Student'}!
             </h2>
             <p style={{ fontSize: 'var(--font-lg)', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
               Pick a channel or conversation from the sidebar to start collaborating with your classmates.
             </p>
          </div>
        )}
      </div>

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
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Conversation Title
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Project Discussion"
                  value={newConversationTitle}
                  onChange={(e) => setNewConversationTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Target Classroom
                </label>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled>Select a classroom</option>
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !newConversationTitle.trim() || !selectedClassroomId}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    opacity: (isCreating || !newConversationTitle.trim() || !selectedClassroomId) ? 0.6 : 1
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
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
            maxWidth: '450px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Manage Conversation</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateConversation}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Conversation Title
                </label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                    <Lock size={18} color="#ef4444" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Lock Conversation</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Prevent students from posting</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsLocked(!editIsLocked)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: editIsLocked ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: editIsLocked ? '23px' : '3px',
                    transition: 'all 0.2s'
                  }} />
                </button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <Clock size={18} color="var(--primary-color)" />
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Slow Mode (seconds)</label>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={editSlowMode}
                  onChange={(e) => setEditSlowMode(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Off</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-color)' }}>{editSlowMode}s</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>60s</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button"
                  onClick={handleDeleteConversation}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  title="Delete Conversation"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--gradient-primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    opacity: isUpdating ? 0.6 : 1
                  }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
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

