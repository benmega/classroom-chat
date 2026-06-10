import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/useAuthStore';
import client from '../api/client';
import useChatSocket from './useChatSocket';
import { GLOBAL_CLASSROOM_ID } from '../utils/constants';

export const useChatLogic = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationsOffset, setConversationsOffset] = useState(0);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [globalConversationId, setGlobalConversationId] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');

  // Editing state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [editSlowMode, setEditSlowMode] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const onMessageReceived = useCallback((data) => {
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

      if (prev.length > 0 && prev[0]?.conversation_id && prev[0].conversation_id !== data.conversation_id) {
        return prev;
      }
      return [...prev, data];
    });
  }, []);

  const fetchHistory = useCallback(async (defaultConvId = null, offset = 0) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (offset > 0) {
      setIsLoadingMoreConversations(true);
    }
    try {
      const limit = 20;
      const response = await client.get(`/message/api/conversations/${user.id}?limit=${limit}&offset=${offset}`);
      const historyData = response.data.data || response.data;
      
      setConversations(prev => {
        if (offset === 0) return historyData;
        const merged = [...prev];
        historyData.forEach(newConv => {
          if (!merged.some(c => c.conversation_id === newConv.conversation_id)) {
            merged.push(newConv);
          }
        });
        return merged;
      });

      setHasMoreConversations(historyData.length === limit);

      if (defaultConvId && offset === 0) {
        let target = historyData.find(c => c.conversation_id === defaultConvId);
        if (!target) {
          try {
            const singleRes = await client.get(`/message/view_conversation/${defaultConvId}`);
            target = singleRes.data.conversation || singleRes.data;
            if (target) {
              setConversations(prev => [target, ...prev]);
            }
          } catch (err) {
            console.error('Failed to load global conversation', err);
          }
        }
        if (target) {
          setActiveConversation(target);
          try {
            const msgsRes = await client.get(`/message/view_conversation/${target.conversation_id}`);
            const fullConv = msgsRes.data.conversation || msgsRes.data;
            setMessages(fullConv.messages || []);
          } catch (err) {
            console.error('Failed to load messages for active conversation', err);
            setMessages(target.messages || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load conversation history', err);
    } finally {
      setLoading(false);
      setIsLoadingMoreConversations(false);
    }
  }, [user]);

  const handleLoadMoreConversations = useCallback(async () => {
    if (isLoadingMoreConversations || !hasMoreConversations) return;
    const nextOffset = conversationsOffset + 20;
    setConversationsOffset(nextOffset);
    await fetchHistory(null, nextOffset);
  }, [conversationsOffset, hasMoreConversations, isLoadingMoreConversations, fetchHistory]);

  const onClassroomEnrolled = useCallback((data) => {
    const classroom = data?.classroom;
    if (!classroom) return;
    toast.success(`You've been enrolled in "${classroom.name}"!`);
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

  const onMessageDeleted = useCallback((data) => {
    setConversations(prev => prev.map(c => {
      if (c.conversation_id === data.conversation_id && c.messages) {
        return {
          ...c,
          messages: c.messages.filter(m => m.id !== data.message_id)
        };
      }
      return c;
    }));
    setMessages(prev => prev.filter(m => m.id !== data.message_id));
  }, []);

  const { sendMessage } = useChatSocket(onMessageReceived, onClassroomEnrolled, {
    onConversationCreated,
    onConversationUpdated,
    onConversationDeleted,
    onMessageDeleted
  });

  useEffect(() => {
    const initChat = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const ctxRes = await client.get('/message/api/me/context');
        const ctx = ctxRes.data;
        const globalConvId = ctx.global_conversation_id;
        setGlobalConversationId(globalConvId);
        setClassrooms(ctx.classrooms || []);
        
        const firstClassroom = (ctx.classrooms || []).find(c => c.id !== GLOBAL_CLASSROOM_ID);
        if (firstClassroom) setSelectedClassroomId(firstClassroom.id);

        await fetchHistory(globalConvId, 0);
      } catch {
        await fetchHistory(null, 0);
      }
    };

    initChat();
  }, [user, fetchHistory]);

  useEffect(() => {
    if (conversations.length > 0) {
      const params = new URLSearchParams(location.search);
      const convId = params.get('conv');
      if (convId) {
        const targetConv = conversations.find(c => c.conversation_id === parseInt(convId));
        if (targetConv && activeConversation?.conversation_id !== targetConv.conversation_id) {
          handleSelectConversation(targetConv);
        }
      }
    }
  }, [location.search, conversations, activeConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    sendMessage({
      content: newMessage.trim(),
      conversation_id: activeConversation.conversation_id
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

  const handleSelectConversation = async (conv) => {
    setActiveConversation(conv);
    setMessages(conv.messages || []);
    try {
      const response = await client.get(`/message/view_conversation/${conv.conversation_id}`);
      const convData = response.data.conversation || response.data;
      setMessages(convData.messages || []);
      setConversations(prev => prev.map(c => 
        c.conversation_id === conv.conversation_id ? { ...c, messages: convData.messages } : c
      ));
    } catch (err) {
      console.error('Failed to load messages for conversation', err);
    }
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

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await client.delete(`/message/delete_message/${messageId}`);
      toast.success('Message deleted');
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setConversations(prevConvs => prevConvs.map(conv => {
        if (conv.conversation_id === activeConversation?.conversation_id && conv.messages) {
          return {
            ...conv,
            messages: conv.messages.filter(m => m.id !== messageId)
          };
        }
        return conv;
      }));
    } catch (err) {
      toast.error('Failed to delete message');
      console.error(err);
    }
  };

  return {
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
    hasMoreConversations,
    isLoadingMoreConversations,
    handleLoadMoreConversations,
    handleDeleteMessage
  };
};
