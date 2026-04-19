import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Send, 
  MessageSquare,
  Hash,
  Menu,
  Smile,
  X
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useSidebar } from '../../context/SidebarContext';
import './Chat.css';

import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import useChatSocket from '../../hooks/useChatSocket';

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
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

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
        const historyData = response.data.data || response.data; 
        setConversations(historyData);
        // Do not auto-select first conversation to allow welcome message to show
        // if (historyData.length > 0) {
        //   setActiveConversation(historyData[0]);
        //   setMessages(historyData[0].messages || []);
        // }
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

    sendMessage({
      content: newMessage,
      conversation_id: activeConversation.conversation_id
    });

    setNewMessage('');
    setShowEmojiPicker(false);
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
      <ChatSidebar 
        user={user}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        conversations={conversations}
        activeConversation={activeConversation}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSelectConversation={handleSelectConversation}
        setIsModalOpen={setIsModalOpen}
        formatConversationTitle={formatConversationTitle}
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
                <form 
                  onSubmit={handleSendMessage}
                  className="chat-input-form"
                >
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..." 
                    className="chat-input-field"
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
               fontSize: 'var(--font-4xl)', 
               fontWeight: 800, 
               letterSpacing: '-0.025em',
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
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !newConversationTitle.trim()}
                  className="btn-primary"
                  style={{ flex: 2 }}
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

