import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import client from '../api/client';
import useChatSocket from './useChatSocket';
import { GLOBAL_CLASSROOM_ID } from '../utils/constants';

export const useFeedLogic = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Targeting states
  const [targetClassrooms, setTargetClassrooms] = useState([]);
  const [targetUsers, setTargetUsers] = useState([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [targetLive, setTargetLive] = useState(false);
  
  // Context lists
  const [classrooms, setClassrooms] = useState([]);
  const [users, setUsers] = useState([]);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const onMessageReceived = useCallback((data) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === data.id);
      if (exists) return prev;
      return [data, ...prev]; // Prepend new message to feed
    });
  }, []);

  const onMessageDeleted = useCallback((data) => {
    setMessages(prev => prev.filter(m => m.id !== data.message_id));
  }, []);

  const { sendMessage } = useChatSocket(onMessageReceived, () => {}, {
    onMessageDeleted
  });

  const fetchFeed = useCallback(async (beforeId = null) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (beforeId) {
      setIsLoadingMore(true);
    }
    try {
      const limit = 50;
      let url = `/message/api/feed?limit=${limit}`;
      if (beforeId) {
        url += `&before_id=${beforeId}`;
      }
      
      const response = await client.get(url);
      const feedData = response.data.messages || [];
      
      setMessages(prev => {
        if (!beforeId) return feedData;
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
  }, [user]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    const lastMessageId = messages[messages.length - 1].id;
    await fetchFeed(lastMessageId);
  }, [isLoadingMore, hasMore, messages, fetchFeed]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Load more when user scrolls close to the bottom
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      handleLoadMore();
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
        
        await fetchFeed();
      } catch (e) {
        console.error(e);
        await fetchFeed();
      }
    };

    initFeed();
  }, [user, fetchFeed]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessage({
      content: newMessage.trim(),
      is_global: isGlobal,
      target_live: targetLive,
      target_classrooms: targetClassrooms,
      target_users: targetUsers
    });

    setNewMessage('');
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
      toast.success('Message deleted');
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      toast.error('Failed to delete message');
      console.error(err);
    }
  }, []);

  const toggleTargetClassroom = (id) => {
    setTargetClassrooms(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleTargetUser = (id) => {
    setTargetUsers(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    );
  };

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
    handleScroll,
    handleLoadMore
  };
};
