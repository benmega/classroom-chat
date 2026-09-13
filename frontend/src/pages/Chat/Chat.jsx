import React from 'react';
import { 
  Send, 
  Smile,
  Globe,
  Users,
  Radio,
  UserPlus,
  X
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './Chat.css';

import ChatMessage from '../../components/chat/ChatMessage';
import MultiSelectDropdown from '../../components/chat/MultiSelectDropdown';
import Skeleton from '../../components/common/Skeleton';

// Hooks
import { useFeedLogic } from '../../hooks/useFeedLogic';

const Chat = ({ filterClassroomId = null }) => {
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
    scrollRef,
    textareaRef,
    emojiPickerRef,
    handleSendMessage,
    handleTextareaKeyDown,
    handleTextareaChange,
    onEmojiClick,
    handleDeleteMessage,
    file,
    setFile,
    handleScroll,
    cooldown
  } = useFeedLogic(filterClassroomId);

  const fileInputRef = React.useRef(null);

  if (loading) return (
    <div className="feed-loading-skeleton-container p-2rem">
      <span className="d-none">Loading Feed...</span>
      <div className="feed-main w-100">
        {/* Mock Messages List */}
        <div className="feed-messages-list d-flex flex-col gap-1-5rem">
          {[1, 2, 3].map(i => (
            <div key={i} className="message-wrapper chat-skeleton-message">
              <Skeleton height="40px" width="40px" borderRadius="50%" className="flex-shrink-0" />
              <div className="flex-1">
                <div className="d-flex gap-sm mb-sm align-center">
                  <Skeleton height="18px" width="100px" />
                  <Skeleton height="14px" width="60px" />
                </div>
                <Skeleton height="16px" className="mb-6px" />
                <Skeleton height="16px" width="80%" />
              </div>
            </div>
          ))}
        </div>
        {/* Mock Input Area */}
        <div className="feed-input-area mt-2rem opacity-60">
          <div className="feed-input-wrapper-container chat-skeleton-input">
            <Skeleton height="60px" className="mb-md" />
            <div className="d-flex justify-between align-center">
              <Skeleton height="36px" width="120px" borderRadius="18px" />
              <Skeleton height="36px" width="80px" borderRadius="18px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div data-testid="feed-container" className="feed-container">
      <div className="feed-main">
        <div 
          ref={scrollRef}
          data-testid="feed-messages" className="feed-messages"
          onScroll={handleScroll}
        >
          <div className="feed-messages-inner">
            {!hasMore && messages.length > 0 && (
              <div className="feed-end-msg">
                You've reached the end of the feed.
              </div>
            )}

            {isLoadingMore && (
              <div className="feed-loading-more">
                Loading more...
              </div>
            )}

            {messages.length === 0 ? (
              <div className="feed-empty-msg">
                No messages to display. Be the first to post!
              </div>
            ) : (
              [...messages].reverse().map((msg, index, arr) => {
                const isConsecutive = index > 0 && arr[index - 1].user_id === msg.user_id;
                return (
                  <ChatMessage 
                    key={msg.id || index}
                    msg={msg}
                    user={user}
                    onDelete={handleDeleteMessage}
                    isConsecutive={isConsecutive}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="feed-input-area">
          <form onSubmit={handleSendMessage} className="feed-input-wrapper-container">
            <div className="feed-input-form-mockup">
                {file && (
                  <div className="attached-file-chip" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', width: 'fit-content' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-color)' }}>{file.name}</span>
                    <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', color: 'var(--text-muted)' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={cooldown > 0 ? `Please wait ${cooldown}s...` : (file ? `Add a note for your submission...` : `What's on your mind, ${user?.nickname || user?.username || 'Student'}?`)}
                  className="feed-input-field"
                  rows={2}
                  maxLength={user?.role === 'admin' ? 4000 : 500}
                  disabled={cooldown > 0}
                />
                
                <div className="feed-toolbar">
                  <div className="feed-targeting">
                    {file ? (
                      <span className="targeting-label-for" style={{ color: 'var(--text-muted)' }}>Sending to Admin Inbox</span>
                    ) : (
                      <>
                        <span className="targeting-label-for">For</span>

                        {classrooms.filter(c => c.id !== 'global').length > 0 && (
                          <MultiSelectDropdown
                            icon={Users}
                            defaultLabel="Classes"
                            options={classrooms.filter(c => c.id !== 'global')}
                            selectedValues={targetClassrooms}
                            onChange={setTargetClassrooms}
                            disabled={isGlobal || cooldown > 0}
                          />
                        )}

                        {user?.role === 'admin' && users?.length > 0 && (
                          <MultiSelectDropdown
                            icon={UserPlus}
                            defaultLabel="Students"
                            options={users}
                            selectedValues={targetUsers}
                            onChange={setTargetUsers}
                            disabled={isGlobal || cooldown > 0}
                          />
                        )}

                        {user?.role === 'admin' && (
                          <label className="targeting-option checkbox-option" title="Send to everyone">
                            <input 
                              type="checkbox" 
                              checked={isGlobal} 
                              onChange={(e) => setIsGlobal(e.target.checked)}
                              disabled={cooldown > 0}
                            />
                            <Globe size={16} /> Global
                          </label>
                        )}
                        
                        <label className="targeting-option checkbox-option" title="Send to online users">
                          <input 
                            type="checkbox" 
                            checked={targetLive} 
                            onChange={(e) => setTargetLive(e.target.checked)}
                            disabled={cooldown > 0}
                          />
                          <Radio size={16} /> Live
                        </label>
                      </>
                    )}
                  </div>

                  <div className="feed-actions">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                          e.target.value = null; // reset input
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="toolbar-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file"
                      disabled={cooldown > 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
                        <button
                          type="button"
                          className="toolbar-btn"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          title="Add emoji"
                          disabled={cooldown > 0}
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
                      disabled={(!newMessage.trim() && !file) || cooldown > 0}
                      className="chat-send-btn"
                      aria-label="Post message"
                    >
                      <Send size={18} /> {cooldown > 0 ? `Wait (${cooldown}s)` : 'Post'}
                    </button>
                  </div>
                </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
