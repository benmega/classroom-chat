import React from 'react';
import { 
  Send, 
  MessageSquare,
  Hash,
  Menu,
  Smile,
  Settings,
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import useSidebar from '../../hooks/useSidebar';
import './Chat.css';

// Extracted Components
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatMessage from '../../components/chat/ChatMessage';
import NewConversationModal from '../../components/chat/NewConversationModal';
import ManageConversationModal from '../../components/chat/ManageConversationModal';
import { formatConversationTitle } from '../../utils/chatUtils';

// Hooks & Constants
import { useChatLogic } from '../../hooks/useChatLogic';
import { GLOBAL_CLASSROOM_ID } from '../../utils/constants';

const Chat = () => {
  const { isSidebarOpen, setSidebarOpen, toggleSidebar } = useSidebar();
  const {
    user,
    conversations,
    activeConversation,
    messages,
    newMessage,
    loading,
    isModalOpen,
    setIsModalOpen,
    newConversationTitle,
    setNewConversationTitle,
    isCreating,
    searchTerm,
    setSearchTerm,
    showEmojiPicker,
    setShowEmojiPicker,
    globalConversationId,
    classrooms,
    selectedClassroomId,
    setSelectedClassroomId,
    isEditModalOpen,
    setIsEditModalOpen,
    editTitle,
    setEditTitle,
    editIsLocked,
    setEditIsLocked,
    editSlowMode,
    setEditSlowMode,
    isUpdating,
    scrollRef,
    textareaRef,
    emojiPickerRef,
    handleSendMessage,
    handleTextareaKeyDown,
    handleTextareaChange,
    onEmojiClick,
    handleSelectConversation,
    handleCreateConversation,
    openEditModal,
    handleUpdateConversation,
    handleDeleteConversation,
    handleDeleteMessage
  } = useChatLogic();

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
                    onDelete={handleDeleteMessage}
                  />
                ))}
              </div>
            </div>

            <div className="chat-input-area">
              <div className="chat-input-content">
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

      <NewConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateConversation}
        title={newConversationTitle}
        setTitle={setNewConversationTitle}
        classrooms={classrooms}
        selectedClassroomId={selectedClassroomId}
        setSelectedClassroomId={setSelectedClassroomId}
        isCreating={isCreating}
      />

      <ManageConversationModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateConversation}
        onDelete={handleDeleteConversation}
        title={editTitle}
        setTitle={setEditTitle}
        isLocked={editIsLocked}
        setIsLocked={setEditIsLocked}
        slowMode={editSlowMode}
        setSlowMode={setEditSlowMode}
        isUpdating={isUpdating}
      />
    </div>
  );
};

export default Chat;
