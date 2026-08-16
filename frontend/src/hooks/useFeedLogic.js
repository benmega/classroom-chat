import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import client from '../api/client';
import useChatSocket from './useChatSocket';
import { GLOBAL_CLASSROOM_ID } from '../utils/constants';

export const useFeedLogic = (filterClassroomId = null) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Targeting states
  const [targetClassrooms, setTargetClassrooms] = useState(filterClassroomId ? [filterClassroomId] : []);
  const [targetUsers, setTargetUsers] = useState([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [targetLive, setTargetLive] = useState(false);
  
  // Context lists
  const [classrooms, setClassrooms] = useState([]);
  const [users, setUsers] = useState([]);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  const prevMessagesLength = useRef(0);
  const prevScrollHeight = useRef(0);
  const lastFirstMessageId = useRef(null);

  // When filterClassroomId changes, reset the feed
  useEffect(() => {
    if (filterClassroomId) {
      setTargetClassrooms([filterClassroomId]);
    }
  }, [filterClassroomId]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const lenDiff = messages.length - prevMessagesLength.current;
    
    if (lenDiff > 0) {
      // Check if we loaded older messages.
      // Older messages are added to the end of the messages array (when index 0 is newest).
      // So if the first elements of messages are the same, it means we prepended older messages to the UI.
      const isLoadMore = prevMessagesLength.current > 0 && messages[0]?.id === lastFirstMessageId.current;
      
      if (isLoadMore) {
        // Adjust scroll position to prevent jumping
        const heightDiff = container.scrollHeight - prevScrollHeight.current;
        container.scrollTop = container.scrollTop + heightDiff;
      } else {
        // Initial load or new message
        // Scroll to bottom if it's initial load or the user was already near the bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        const isOwnNewMessage = messages[0]?.user_id === user?.id;
        
        if (prevMessagesLength.current === 0 || isNearBottom || isOwnNewMessage) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }

    prevMessagesLength.current = messages.length;
    prevScrollHeight.current = container.scrollHeight;
    lastFirstMessageId.current = messages[0]?.id;
  }, [messages, user?.id]);

  const onMessageReceived = useCallback((data) => {
    // If filterClassroomId is set and this message isn't global, ensure it targets this class
    if (filterClassroomId && !data.is_global) {
      if (!data.target_classroom_ids || !data.target_classroom_ids.includes(String(filterClassroomId))) {
        return; // Ignore message meant for a different class
      }
    }

    setMessages(prev => {
      const exists = prev.some(m => m.id === data.id);
      if (exists) return prev;
      return [data, ...prev]; // Prepend new message to feed
    });
  }, [filterClassroomId]);

  const onMessageDeleted = useCallback((data) => {
    setMessages(prev => prev.filter(m => m.id !== data.message_id));
  }, []);

  const { sendMessage } = useChatSocket(onMessageReceived, () => {}, {
    onMessageDeleted
  });

  const fetchFeed = useCallback(async (beforeId = null, refresh = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (beforeId) {
      setIsLoadingMore(true);
    }
    if (refresh) {
      setLoading(true);
    }
    try {
      const limit = 20;
      let url = `/message/api/feed?limit=${limit}`;
      if (beforeId) {
        url += `&before_id=${beforeId}`;
      }
      if (filterClassroomId) {
        url += `&classroom_id=${filterClassroomId}`;
      }
      
      const response = await client.get(url);
      const feedData = response.data.messages || [];
      
      setMessages(prev => {
        if (!beforeId || refresh) return feedData;
        const merged = [...prev];
        feedData.forEach(newMsg => {
          if (!merged.some(m => m.id === newMsg.id)) {
            merged.push(newMsg);
          }
        });
        return merged;
      });

      setHasMore(feedData.length === limit);
    } catch (err) {
      console.error('Failed to load feed', err);
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, filterClassroomId]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    const lastMessageId = messages[messages.length - 1].id;
    await fetchFeed(lastMessageId);
  }, [isLoadingMore, hasMore, messages, fetchFeed]);

  const _scrollThrottle = React.useRef(null);
  const handleScroll = (e) => {
    // Throttle to 150ms to prevent multiple concurrent load-more requests
    // while React state (isLoadingMore) hasn't settled yet between renders.
    if (_scrollThrottle.current) return;
    const { scrollTop } = e.target;
    if (scrollTop <= 100) {
      _scrollThrottle.current = setTimeout(() => {
        _scrollThrottle.current = null;
        handleLoadMore();
      }, 150);
    }
  };

  useEffect(() => {
    const initFeed = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        // Fetch context to get classrooms and users
        const ctxRes = await client.get('/message/api/me/context');
        const ctx = ctxRes.data;
        
        const sortedClassrooms = (ctx.classrooms || []).sort((a, b) => a.name.localeCompare(b.name));
        const sortedUsers = (ctx.users || []).sort((a, b) => {
          const nameA = a.nickname || a.username || '';
          const nameB = b.nickname || b.username || '';
          return nameA.localeCompare(nameB);
        });

        setClassrooms(sortedClassrooms);
        setUsers(sortedUsers);
        
        await fetchFeed(null, true);
      } catch (e) {
        console.error(e);
        await fetchFeed(null, true);
      }
    };

    initFeed();
  }, [user, fetchFeed, filterClassroomId]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !file) || cooldown > 0) return;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (newMessage.trim()) {
        formData.append('note', newMessage.trim());
      }
      
      try {
        await client.post('/api/submissions', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('File submitted successfully');
        setFile(null);
        setNewMessage('');
        setShowEmojiPicker(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (err) {
        toast.error('Failed to submit file');
        console.error(err);
      }
      return;
    }

    const messageToSend = newMessage.trim();

    setNewMessage('');
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (user?.role !== 'admin') {
      setCooldown(30);
    }

    sendMessage({
      content: messageToSend,
      is_global: isGlobal,
      target_live: targetLive,
      target_classrooms: targetClassrooms,
      target_users: targetUsers
    }, (response) => {
      if (response && !response.success) {
        toast.error(response.error || 'Failed to send message.');
        setNewMessage(messageToSend);
        setCooldown(0);
      }
    });
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
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

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await client.delete(`/message/delete_message/${messageId}`);
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      toast.error('Failed to delete message');
      console.error(err);
    }
  }, []);

  const toggleTargetClassroom = (id) => {
    if (filterClassroomId) return; // Disable toggling if fixed filter
    setTargetClassrooms(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleTargetUser = (id) => {
    setTargetUsers(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

  // Mark messages as read when feed updates
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      const latestMsgId = messages[0].id;
      const key = `last_read_message_id_${user.id}`;
      localStorage.setItem(key, latestMsgId.toString());
      useAuthStore.getState().setUnreadCount(0);
      useAuthStore.getState().setLastReadMessageId(latestMsgId);
    }
  }, [messages, user?.id]);

  return {
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
    toggleTargetClassroom,
    targetUsers,
    setTargetUsers,
    toggleTargetUser,
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
    handleLoadMore,
    cooldown
  };
};
