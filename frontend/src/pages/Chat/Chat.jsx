import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Send, 
  Paperclip, 
  Search, 
  MoreVertical, 
  User as UserIcon, 
  MessageSquare,
  Clock,
  Settings,
  PlusCircle,
  Hash
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import useChatSocket from '../../hooks/useChatSocket';


const Chat = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Define callback for incoming messages via Socket.io
  const onMessageReceived = useCallback((data) => {
    // Only add if it's for the current logic (we could filter by conversation_id if needed)
    setMessages(prev => {
      // Avoid duplicates if we already have it (e.g. from optimistic update)
      const exists = prev.some(m => 
        (m.content === data.content && m.username === data.username && Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 1000)
      );
      if (exists) return prev;
      return [...prev, data];
    });
  }, []);

  const { isConnected, sendMessage } = useChatSocket(onMessageReceived);

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
      } catch (err) {
        setError('Failed to load conversation history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

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
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>;

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 140px)', /* Increased height for more viewing space */
      overflow: 'hidden',
      margin: '-20px', /* Offset the Layout main padding */
      background: 'var(--bg-primary)'
    }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '320px', 
        background: 'var(--bg-primary)', 
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
             <h2 style={{ fontSize: '1.25rem' }}>Messages</h2>
             <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
               <PlusCircle size={20} />
             </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search conversations..." 
              style={{ 
                width: '100%', 
                padding: '8px 12px 8px 36px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)',
                fontSize: '0.875rem'
              }} 
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map((conv) => (
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
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                     {conv.title || 'Untitled Conversation'}
                   </h4>
                 </div>
                 <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                   {conv.messages?.[conv.messages.length - 1]?.content || 'No messages yet'}
                 </p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: '0.5rem 1rem', 
              background: 'var(--bg-primary)', 
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={20} color="var(--primary-color)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeConversation.title || 'Untitled Conversation'}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 600 }}>Active Now</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                 <button style={{ background: 'none', border: 'none', padding: '8px', color: 'var(--text-secondary)' }}><Search size={18} /></button>
                 <button style={{ background: 'none', border: 'none', padding: '8px', color: 'var(--text-secondary)' }}><Clock size={18} /></button>
                 <button style={{ background: 'none', border: 'none', padding: '8px', color: 'var(--text-secondary)' }}><MoreVertical size={18} /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {messages.map((msg, index) => {
                const isUser = msg.user_id === user.id;
                return (
                  <div 
                    key={msg.id || index} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      gap: '4px'
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
                          <img src={`/user/profile_pictures/${msg.user_profile_pic}`} alt={msg.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <UserIcon size={16} />
                        )}
                      </div>
                    </Link>
                      <div style={{ 
                        maxWidth: '60%',
                        padding: '0.5rem 0.8rem',
                        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isUser ? 'var(--primary-color)' : 'var(--bg-primary)',
                        color: isUser ? 'white' : 'var(--text-primary)',
                        boxShadow: 'var(--shadow-sm)',
                        fontSize: '0.9375rem'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: isUser ? '0 40px 0 0' : '0 0 0 40px' }}>
                      {msg.nickname || 'Unknown'} • {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-subtle)' }}>
              <form 
                onSubmit={handleSendMessage}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  background: 'var(--bg-tertiary)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <button type="button" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', padding: '8px' }}>
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..." 
                  style={{ 
                    flex: 1, 
                    background: 'none', 
                    border: 'none', 
                    padding: '8px 0', 
                    outline: 'none',
                    fontSize: '0.9375rem',
                    color: 'var(--text-primary)'
                  }} 
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    style={{ 
                      background: 'var(--primary-color)', 
                      color: 'white', 
                      border: 'none', 
                      padding: '10px', 
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: newMessage.trim() ? 1 : 0.5,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
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
    </div>
  );
};

export default Chat;
