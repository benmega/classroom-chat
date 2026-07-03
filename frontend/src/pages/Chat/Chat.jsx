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

  if (loading) return <div className="container feed-loading">Loading Feed...</div>;

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
