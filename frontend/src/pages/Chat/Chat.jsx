import React from 'react';
import { 
  Send, 
  Smile,
  Globe,
  Users,
  Radio,
  UserPlus
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

// Extracted Components
import ChatMessage from '../../components/chat/ChatMessage';
import MultiSelectDropdown from '../../components/chat/MultiSelectDropdown';
import Skeleton from '../../components/common/Skeleton';

// Hooks
import { useFeedLogic } from '../../hooks/useFeedLogic';

const Chat = () => {
  const {
    user,
    messages,
    newMessage,
    loading,
    isLoadingMore,
    hasMore,
    showEmojiPicker,
    setShowEmojiPicker,
    classrooms,
    users,
    isGlobal,
    setIsGlobal,
    targetLive,
    setTargetLive,
    targetClassrooms,
    setTargetClassrooms,
    targetUsers,
    setTargetUsers,
    textareaRef,
    emojiPickerRef,
    handleSendMessage,
    handleTextareaKeyDown,
    handleTextareaChange,
    onEmojiClick,
    handleDeleteMessage,
    handleScroll
  } = useFeedLogic();

  if (loading) return (
    <div className="feed-loading-skeleton-container" style={{ padding: '2rem' }}>
      <span style={{ display: 'none' }}>Loading Feed...</span>
      <div className="feed-main" style={{ width: '100%' }}>
        {/* Mock Input Area */}
        <div className="feed-input-area" style={{ marginBottom: '2rem', opacity: 0.6 }}>
          <div className="feed-input-wrapper-container" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <Skeleton height="60px" style={{ marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton height="36px" width="120px" borderRadius="18px" />
              <Skeleton height="36px" width="80px" borderRadius="18px" />
            </div>
          </div>
        </div>
        {/* Mock Messages List */}
        <div className="feed-messages-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="message-wrapper" style={{ display: 'flex', gap: '1rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <Skeleton height="40px" width="40px" borderRadius="50%" style={{ flexShrink: 0 }} />
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <Skeleton height="18px" width="100px" />
                  <Skeleton height="14px" width="60px" />
                </div>
                <Skeleton height="16px" style={{ marginBottom: '6px' }} />
                <Skeleton height="16px" width="80%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="feed-container">
      <div className="feed-main">
        <div className="feed-input-area">
          <form onSubmit={handleSendMessage} className="feed-input-wrapper-container">
            <div className="feed-input-form-mockup">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={`What's on your mind, ${user?.nickname || user?.username || 'Student'}?`}
                  className="feed-input-field"
                  rows={2}
                  maxLength={user?.is_admin ? 4000 : 500}
                />
                
                <div className="feed-toolbar">
                  <div className="feed-targeting">
                    <span className="targeting-label-for">For</span>

                    {classrooms.filter(c => c.id !== 'global').length > 0 && (
                      <MultiSelectDropdown
                        icon={Users}
                        defaultLabel="Classes"
                        options={classrooms.filter(c => c.id !== 'global')}
                        selectedValues={targetClassrooms}
                        onChange={setTargetClassrooms}
                        disabled={isGlobal}
                      />
                    )}

                    {user?.is_admin && users?.length > 0 && (
                      <MultiSelectDropdown
                        icon={UserPlus}
                        defaultLabel="Students"
                        options={users}
                        selectedValues={targetUsers}
                        onChange={setTargetUsers}
                        disabled={isGlobal}
                      />
                    )}

                    {user?.is_admin && (
                      <label className="targeting-option checkbox-option" title="Send to everyone">
                        <input 
                          type="checkbox" 
                          checked={isGlobal} 
                          onChange={(e) => setIsGlobal(e.target.checked)}
                        />
                        <Globe size={16} /> Global
                      </label>
                    )}
                    
                    <label className="targeting-option checkbox-option" title="Send to online users">
                      <input 
                        type="checkbox" 
                        checked={targetLive} 
                        onChange={(e) => setTargetLive(e.target.checked)}
                      />
                      <Radio size={16} /> Live
                    </label>
                  </div>

                  <div className="feed-actions">
                    <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          title="Add emoji"
                        >
                          <Smile size={20} color={showEmojiPicker ? "var(--primary-color)" : "inherit"} />
                        </button>
                        {showEmojiPicker && (
                          <div className="emoji-picker-container emoji-picker-container-absolute">
                            <EmojiPicker
                              onEmojiClick={onEmojiClick}
                              autoFocusSearch={false}
                              theme="auto"
                              width={320}
                              height={400}
                            />
                          </div>
                        )}
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="chat-send-btn"
                      aria-label="Post message"
                    >
                      <Send size={18} /> Post
                    </button>
                  </div>
                </div>
            </div>
          </form>
        </div>

        <div 
          className="feed-messages"
          onScroll={handleScroll}
        >
          <div className="feed-messages-inner">
            {messages.length === 0 ? (
              <div className="feed-empty-msg">
                No messages to display. Be the first to post!
              </div>
            ) : (
              messages.map((msg, index) => (
                <ChatMessage 
                  key={msg.id || index}
                  msg={msg}
                  user={user}
                  onDelete={handleDeleteMessage}
                />
              ))
            )}
            
            {isLoadingMore && (
              <div className="feed-loading-more">
                Loading more...
              </div>
            )}
            
            {!hasMore && messages.length > 0 && (
              <div className="feed-end-msg">
                You've reached the end of the feed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
