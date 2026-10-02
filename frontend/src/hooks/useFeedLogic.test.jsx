import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import client from '../api/client';
import { showConfirm } from '../utils/confirm';
import { useFeedLogic } from './useFeedLogic';

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../utils/confirm', () => ({ showConfirm: vi.fn() }));

// What the hook hands to useChatSocket, so a test can play a socket event into it, and the
// sendMessage it gets back, so a test can see what would have been emitted.
const socket = vi.hoisted(() => ({
  onMessageReceived: null,
  lifecycle: null,
  sendMessage: vi.fn(),
}));
vi.mock('./useChatSocket', () => ({
  default: (onMessageReceived, _onClassroomEnrolled, lifecycle) => {
    socket.onMessageReceived = onMessageReceived;
    socket.lifecycle = lifecycle;
    return { sendMessage: socket.sendMessage };
  },
}));

// The hook reads the user with the hook form and the unread-count setters from getState()
const authState = vi.hoisted(() => ({
  user: null,
  setUnreadCount: vi.fn(),
  setLastReadMessageId: vi.fn(),
}));
vi.mock('../store/useAuthStore', () => {
  const store = () => ({ user: authState.user });
  store.getState = () => authState;
  return { default: store };
});

const FEED_URL = '/message/api/feed?limit=20';
const CONTEXT_URL = '/message/api/me/context';

const student = { id: 1, username: 'student', role: 'student' };
const admin = { id: 9, username: 'teacher', role: 'admin' };

const msg = (id, extra = {}) => ({ id, user_id: 50, content: `message ${id}`, ...extra });
const range = (from, to) => Array.from({ length: from - to + 1 }, (_, i) => msg(from - i));

// Serves the context and feed endpoints; the feed answers each request with the next page given
const serveFeed = ({ pages = [[]], context = { classrooms: [], users: [] } } = {}) => {
  let page = 0;
  client.get.mockImplementation((url) => {
    if (url === CONTEXT_URL) return Promise.resolve({ data: context });
    if (url.startsWith('/message/api/feed')) {
      const messages = pages[Math.min(page, pages.length - 1)];
      page += 1;
      return Promise.resolve({ data: { messages } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};
const feedUrls = () => client.get.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/message/api/feed'));

const mountFeed = async (filterClassroomId = null) => {
  const hook = renderHook(() => useFeedLogic(filterClassroomId));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

const typeMessage = (result, text) => act(() => {
  result.current.handleTextareaChange({ target: { value: text, style: {}, scrollHeight: 40 } });
});

describe('useFeedLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authState.user = student;
    serveFeed();
    client.post.mockResolvedValue({ data: {} });
    client.delete.mockResolvedValue({ data: {} });
    showConfirm.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    console.error.mockRestore();
  });

  describe('loading the feed', () => {
    it('loads the context and the newest page for a signed-in user', async () => {
      serveFeed({
        pages: [[msg(3), msg(2), msg(1)]],
        context: {
          classrooms: [{ id: 'b', name: 'Beta' }, { id: 'a', name: 'Alpha' }],
          users: [{ id: 3, username: 'zed' }, { id: 4, username: 'amy', nickname: 'Zoe' }, { id: 5, username: 'bob' }],
        },
      });

      const { result } = await mountFeed();

      expect(client.get).toHaveBeenCalledWith(CONTEXT_URL);
      expect(feedUrls()).toEqual([FEED_URL]);
      expect(result.current.messages.map((m) => m.id)).toEqual([3, 2, 1]);
      expect(result.current.classrooms.map((c) => c.name)).toEqual(['Alpha', 'Beta']);
      // Sorted by what is shown: the nickname when there is one, else the username
      expect(result.current.users.map((u) => u.id)).toEqual([5, 3, 4]);
      expect(result.current.hasMore).toBe(false);
    });

    it('does not ask the server for anything without a user', async () => {
      authState.user = null;

      const { result } = await mountFeed();

      expect(client.get).not.toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);
    });

    it('still loads the feed when the context cannot be loaded', async () => {
      client.get.mockImplementation((url) => {
        if (url === CONTEXT_URL) return Promise.reject(new Error('context down'));
        return Promise.resolve({ data: { messages: [msg(1)] } });
      });

      const { result } = await mountFeed();

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.classrooms).toEqual([]);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('tolerates a context without classrooms or users', async () => {
      serveFeed({ context: {} });

      const { result } = await mountFeed();

      expect(result.current.classrooms).toEqual([]);
      expect(result.current.users).toEqual([]);
    });

    it('toasts and shows an empty feed when the feed request fails', async () => {
      client.get.mockImplementation((url) => {
        if (url === CONTEXT_URL) return Promise.resolve({ data: {} });
        return Promise.reject(new Error('500'));
      });

      const { result } = await mountFeed();

      expect(toast.error).toHaveBeenCalledWith('Failed to load feed');
      expect(result.current.messages).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('asks only for the feed of the classroom being viewed', async () => {
      const { result } = await mountFeed('class-7');

      expect(feedUrls()).toEqual([`${FEED_URL}&classroom_id=class-7`]);
      expect(result.current.targetClassrooms).toEqual(['class-7']);
    });

    it('marks the newest message as read', async () => {
      serveFeed({ pages: [[msg(12), msg(11)]] });

      await mountFeed();

      await waitFor(() => expect(localStorage.getItem('last_read_message_id_1')).toBe('12'));
      expect(authState.setUnreadCount).toHaveBeenCalledWith(0);
      expect(authState.setLastReadMessageId).toHaveBeenCalledWith(12);
    });

    it('marks nothing as read when the feed is empty', async () => {
      await mountFeed();

      expect(localStorage.getItem('last_read_message_id_1')).toBeNull();
      expect(authState.setUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('loading older messages', () => {
    it('asks for the page before the oldest message and appends it', async () => {
      serveFeed({ pages: [range(40, 21), range(20, 1)] });
      const { result } = await mountFeed();
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.handleLoadMore();
      });

      expect(feedUrls()).toEqual([FEED_URL, `${FEED_URL}&before_id=21`]);
      expect(result.current.messages).toHaveLength(40);
      expect(result.current.messages[0].id).toBe(40);
      expect(result.current.messages.at(-1).id).toBe(1);
      expect(result.current.isLoadingMore).toBe(false);
    });

    it('does not duplicate a message that is already in the feed', async () => {
      serveFeed({ pages: [range(40, 21), [msg(21), ...range(20, 2)]] });
      const { result } = await mountFeed();

      await act(async () => {
        await result.current.handleLoadMore();
      });

      const ids = result.current.messages.map((m) => m.id);
      expect(ids).toHaveLength(new Set(ids).size);
      expect(ids).toHaveLength(39);
    });

    it('keeps the classroom filter on every page', async () => {
      serveFeed({ pages: [range(40, 21), range(20, 1)] });
      const { result } = await mountFeed('class-7');

      await act(async () => {
        await result.current.handleLoadMore();
      });

      expect(feedUrls()[1]).toBe(`${FEED_URL}&before_id=21&classroom_id=class-7`);
    });

    it('stops asking once a page comes back short', async () => {
      serveFeed({ pages: [range(40, 21), range(20, 18)] });
      const { result } = await mountFeed();

      await act(async () => {
        await result.current.handleLoadMore();
      });
      expect(result.current.hasMore).toBe(false);

      await act(async () => {
        await result.current.handleLoadMore();
      });
      expect(feedUrls()).toHaveLength(2);
    });

    it('does not load more when the feed is empty', async () => {
      const { result } = await mountFeed();

      await act(async () => {
        await result.current.handleLoadMore();
      });

      expect(feedUrls()).toHaveLength(1);
    });

    it('keeps the feed and says so when loading more fails', async () => {
      serveFeed({ pages: [range(40, 21)] });
      const { result } = await mountFeed();
      client.get.mockRejectedValue(new Error('500'));

      await act(async () => {
        await result.current.handleLoadMore();
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to load feed');
      expect(result.current.messages).toHaveLength(20);
      expect(result.current.isLoadingMore).toBe(false);
    });

    describe('when the user scrolls to the top', () => {
      const scrollTo = (result, scrollTop) => act(() => {
        result.current.handleScroll({ target: { scrollTop } });
      });

      it('loads the next page', async () => {
        serveFeed({ pages: [range(40, 21), range(20, 1)] });
        const { result } = await mountFeed();

        scrollTo(result, 50);

        await waitFor(() => expect(feedUrls()).toContain(`${FEED_URL}&before_id=21`));
      });

      it('does not load anything while the top is out of reach', async () => {
        serveFeed({ pages: [range(40, 21), range(20, 1)] });
        const { result } = await mountFeed();

        scrollTo(result, 400);
        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(feedUrls()).toHaveLength(1);
      });

      it('sends one request however many scroll events arrive at once', async () => {
        serveFeed({ pages: [range(40, 21), range(20, 1)] });
        const { result } = await mountFeed();

        scrollTo(result, 30);
        scrollTo(result, 20);
        scrollTo(result, 10);
        await waitFor(() => expect(feedUrls()).toHaveLength(2));
        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(feedUrls()).toHaveLength(2);
      });
    });
  });

  describe('keeping the scroll position', () => {
    const attach = (result, container) => {
      result.current.scrollRef.current = container;
    };
    const mountWithContainer = async (container, pages) => {
      serveFeed({ pages });
      const hook = renderHook(() => useFeedLogic());
      attach(hook.result, container);
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      return hook;
    };

    it('jumps to the newest message when the feed first loads', async () => {
      const container = { scrollHeight: 1000, scrollTop: 0, clientHeight: 400 };

      await mountWithContainer(container, [range(3, 1)]);

      expect(container.scrollTop).toBe(1000);
    });

    it('keeps the reader where they were when older messages are added above', async () => {
      const container = { scrollHeight: 1000, scrollTop: 0, clientHeight: 400 };
      const { result } = await mountWithContainer(container, [range(40, 21), range(20, 1)]);
      expect(container.scrollTop).toBe(1000);
      container.scrollTop = 60;
      container.scrollHeight = 1500;

      await act(async () => {
        await result.current.handleLoadMore();
      });

      expect(container.scrollTop).toBe(560);
    });

    it('follows a new message when the reader is near the bottom', async () => {
      const container = { scrollHeight: 1000, scrollTop: 0, clientHeight: 400 };
      const { result } = await mountWithContainer(container, [range(3, 1)]);
      container.scrollTop = 600;
      container.scrollHeight = 1100;

      act(() => socket.onMessageReceived(msg(4)));

      expect(container.scrollTop).toBe(1100);
      expect(result.current.messages[0].id).toBe(4);
    });

    it('stays put for a new message from someone else while the reader is scrolled up', async () => {
      const container = { scrollHeight: 1000, scrollTop: 0, clientHeight: 400 };
      await mountWithContainer(container, [range(3, 1)]);
      container.scrollTop = 100;
      container.scrollHeight = 1100;

      act(() => socket.onMessageReceived(msg(4, { user_id: 50 })));

      expect(container.scrollTop).toBe(100);
    });

    it('jumps to the bottom for the user\'s own new message even when scrolled up', async () => {
      const container = { scrollHeight: 1000, scrollTop: 0, clientHeight: 400 };
      await mountWithContainer(container, [range(3, 1)]);
      container.scrollTop = 100;
      container.scrollHeight = 1100;

      act(() => socket.onMessageReceived(msg(4, { user_id: student.id })));

      expect(container.scrollTop).toBe(1100);
    });
  });

  describe('messages arriving over the socket', () => {
    it('shows a new message at the top of the feed', async () => {
      serveFeed({ pages: [[msg(2), msg(1)]] });
      const { result } = await mountFeed();

      act(() => socket.onMessageReceived(msg(3)));

      expect(result.current.messages.map((m) => m.id)).toEqual([3, 2, 1]);
    });

    it('ignores a message that is already in the feed', async () => {
      serveFeed({ pages: [[msg(2), msg(1)]] });
      const { result } = await mountFeed();

      act(() => socket.onMessageReceived(msg(2, { content: 'again' })));

      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0].content).toBe('message 2');
    });

    it('shows every message when no classroom is being filtered', async () => {
      const { result } = await mountFeed();

      act(() => socket.onMessageReceived(msg(1, { target_classroom_ids: ['other'] })));
      act(() => socket.onMessageReceived(msg(2)));

      expect(result.current.messages.map((m) => m.id)).toEqual([2, 1]);
    });

    describe('while viewing one classroom', () => {
      it('shows a message addressed to that classroom', async () => {
        const { result } = await mountFeed('class-7');

        act(() => socket.onMessageReceived(msg(1, { target_classroom_ids: ['class-3', 'class-7'] })));

        expect(result.current.messages.map((m) => m.id)).toEqual([1]);
      });

      it('matches a numeric classroom id against the string ids the server sends', async () => {
        const { result } = await mountFeed(7);

        act(() => socket.onMessageReceived(msg(1, { target_classroom_ids: ['7'] })));

        expect(result.current.messages.map((m) => m.id)).toEqual([1]);
      });

      it('ignores a message addressed to another classroom', async () => {
        const { result } = await mountFeed('class-7');

        act(() => socket.onMessageReceived(msg(1, { target_classroom_ids: ['class-3'] })));

        expect(result.current.messages).toEqual([]);
      });

      it('ignores a message that names no classroom', async () => {
        const { result } = await mountFeed('class-7');

        act(() => socket.onMessageReceived(msg(1)));

        expect(result.current.messages).toEqual([]);
      });

      it('shows a global message whichever classroom it names', async () => {
        const { result } = await mountFeed('class-7');

        act(() => socket.onMessageReceived(msg(1, { is_global: true, target_classroom_ids: ['class-3'] })));
        act(() => socket.onMessageReceived(msg(2, { is_global: true })));

        expect(result.current.messages.map((m) => m.id)).toEqual([2, 1]);
      });
    });

    it('removes a deleted message by its message_id', async () => {
      serveFeed({ pages: [[msg(3), msg(2), msg(1)]] });
      const { result } = await mountFeed();

      act(() => socket.lifecycle.onMessageDeleted({ message_id: 2 }));

      expect(result.current.messages.map((m) => m.id)).toEqual([3, 1]);
    });

    it('ignores the deletion of a message that is not in the feed', async () => {
      serveFeed({ pages: [[msg(2), msg(1)]] });
      const { result } = await mountFeed();

      act(() => socket.lifecycle.onMessageDeleted({ message_id: 99 }));

      expect(result.current.messages).toHaveLength(2);
    });
  });

  describe('sending a message', () => {
    const send = (result, event) => act(async () => {
      await result.current.handleSendMessage(event);
    });

    it('sends the typed text with the default targeting', async () => {
      const { result } = await mountFeed();
      typeMessage(result, '  hello class  ');

      await send(result, { preventDefault: vi.fn() });

      expect(socket.sendMessage).toHaveBeenCalledTimes(1);
      expect(socket.sendMessage).toHaveBeenCalledWith(
        {
          content: 'hello class',
          is_global: false,
          target_live: false,
          target_classrooms: [],
          target_users: [],
        },
        expect.any(Function)
      );
      expect(result.current.newMessage).toBe('');
    });

    it('prevents the form from reloading the page', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'hi');
      const event = { preventDefault: vi.fn() };

      await send(result, event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('sends the targeting the user picked', async () => {
      const { result } = await mountFeed();
      act(() => {
        result.current.setIsGlobal(true);
        result.current.setTargetLive(true);
        result.current.toggleTargetClassroom('class-3');
        result.current.toggleTargetClassroom('class-4');
        result.current.toggleTargetClassroom('class-3');
        result.current.toggleTargetUser(11);
        result.current.toggleTargetUser(12);
        result.current.toggleTargetUser(11);
      });
      typeMessage(result, 'announcement');

      await send(result);

      expect(socket.sendMessage.mock.calls[0][0]).toEqual({
        content: 'announcement',
        is_global: true,
        target_live: true,
        target_classrooms: ['class-4'],
        target_users: [12],
      });
    });

    it('addresses the classroom being viewed and refuses to retarget it', async () => {
      const { result } = await mountFeed('class-7');
      act(() => result.current.toggleTargetClassroom('class-9'));
      typeMessage(result, 'hi');

      await send(result);

      expect(socket.sendMessage.mock.calls[0][0].target_classrooms).toEqual(['class-7']);
    });

    it('does not send an empty or blank message', async () => {
      const { result } = await mountFeed();

      await send(result);
      typeMessage(result, '   ');
      await send(result);

      expect(socket.sendMessage).not.toHaveBeenCalled();
      expect(result.current.cooldown).toBe(0);
    });

    it('puts a student on a 30 second cooldown', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'hi');

      await send(result);

      expect(result.current.cooldown).toBe(30);
    });

    it('puts an admin on no cooldown', async () => {
      authState.user = admin;
      const { result } = await mountFeed();
      typeMessage(result, 'hi');

      await send(result);

      expect(socket.sendMessage).toHaveBeenCalledTimes(1);
      expect(result.current.cooldown).toBe(0);
    });

    it('does not send while the cooldown runs', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'first');
      await send(result);
      typeMessage(result, 'second');

      await send(result);

      expect(socket.sendMessage).toHaveBeenCalledTimes(1);
      expect(result.current.newMessage).toBe('second');
    });

    it('counts the cooldown down once a second', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'hi');
      vi.useFakeTimers();

      await send(result);
      expect(result.current.cooldown).toBe(30);
      act(() => vi.advanceTimersByTime(3000));

      expect(result.current.cooldown).toBe(27);
    });

    describe('when the server refuses the message', () => {
      const refuse = async (response) => {
        const { result } = await mountFeed();
        typeMessage(result, 'oops');
        await send(result);
        expect(result.current.newMessage).toBe('');
        expect(result.current.cooldown).toBe(30);
        const acknowledge = socket.sendMessage.mock.calls[0][1];
        act(() => acknowledge(response));
        return result;
      };

      it('gives the text back, clears the cooldown and shows the reason', async () => {
        const result = await refuse({ success: false, error: 'You are muted.' });

        expect(toast.error).toHaveBeenCalledWith('You are muted.');
        expect(result.current.newMessage).toBe('oops');
        expect(result.current.cooldown).toBe(0);
      });

      it('uses a generic reason when the server gives none', async () => {
        await refuse({ success: false });

        expect(toast.error).toHaveBeenCalledWith('Failed to send message.');
      });
    });

    describe('when the server accepts the message', () => {
      it.each([
        ['a success acknowledgement', { success: true }],
        ['no acknowledgement body', undefined],
      ])('leaves the cooldown running on %s', async (_name, response) => {
        const { result } = await mountFeed();
        typeMessage(result, 'fine');
        await send(result);

        act(() => socket.sendMessage.mock.calls[0][1](response));

        expect(toast.error).not.toHaveBeenCalled();
        expect(result.current.newMessage).toBe('');
        expect(result.current.cooldown).toBe(30);
      });
    });

    it('resets the height of the message box after sending', async () => {
      const { result } = await mountFeed();
      result.current.textareaRef.current = { style: { height: '120px' } };
      typeMessage(result, 'hi');

      await send(result);

      expect(result.current.textareaRef.current.style.height).toBe('auto');
    });

    describe('with a file attached', () => {
      const file = new File(['pdf'], 'work.pdf', { type: 'application/pdf' });

      it('submits it as work instead of chatting, with the text as the note', async () => {
        const { result } = await mountFeed();
        act(() => result.current.setFile(file));
        typeMessage(result, '  my homework ');

        await send(result);

        expect(client.post).toHaveBeenCalledTimes(1);
        expect(client.post).toHaveBeenCalledWith('/api/submissions', expect.any(FormData));
        const body = client.post.mock.calls[0][1];
        expect(body.get('file').name).toBe('work.pdf');
        expect(body.get('note')).toBe('my homework');
        expect(socket.sendMessage).not.toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('File submitted successfully');
        expect(result.current.file).toBeNull();
        expect(result.current.newMessage).toBe('');
        // Submitting work is not chatting: no cooldown
        expect(result.current.cooldown).toBe(0);
      });

      it('submits a file without a note when no text was typed', async () => {
        const { result } = await mountFeed();
        act(() => result.current.setFile(file));

        await send(result);

        expect(client.post.mock.calls[0][1].has('note')).toBe(false);
      });

      it('resets the height of the message box after submitting', async () => {
        const { result } = await mountFeed();
        result.current.textareaRef.current = { style: { height: '120px' } };
        act(() => result.current.setFile(file));

        await send(result);

        expect(result.current.textareaRef.current.style.height).toBe('auto');
      });

      it('keeps the file and the note when the upload fails', async () => {
        client.post.mockRejectedValueOnce(new Error('413'));
        const { result } = await mountFeed();
        act(() => result.current.setFile(file));
        typeMessage(result, 'my homework');

        await send(result);

        expect(toast.error).toHaveBeenCalledWith('Failed to submit file');
        expect(toast.success).not.toHaveBeenCalled();
        expect(result.current.file).toBe(file);
        expect(result.current.newMessage).toBe('my homework');
      });
    });
  });

  describe('the message box', () => {
    it('sends on Enter and leaves Shift+Enter for a new line', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'hi');
      const shiftEnter = { key: 'Enter', shiftKey: true, preventDefault: vi.fn() };
      const enter = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };

      act(() => result.current.handleTextareaKeyDown(shiftEnter));
      expect(shiftEnter.preventDefault).not.toHaveBeenCalled();
      expect(socket.sendMessage).not.toHaveBeenCalled();

      await act(async () => result.current.handleTextareaKeyDown(enter));
      expect(enter.preventDefault).toHaveBeenCalled();
      expect(socket.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'hi');
      const letter = { key: 'a', shiftKey: false, preventDefault: vi.fn() };

      act(() => result.current.handleTextareaKeyDown(letter));

      expect(letter.preventDefault).not.toHaveBeenCalled();
      expect(socket.sendMessage).not.toHaveBeenCalled();
    });

    it('grows with the text up to 160px', async () => {
      const { result } = await mountFeed();
      const target = { value: 'a', style: { height: '10px' }, scrollHeight: 90 };

      act(() => result.current.handleTextareaChange({ target }));
      expect(target.style.height).toBe('90px');
      expect(result.current.newMessage).toBe('a');

      target.scrollHeight = 400;
      act(() => result.current.handleTextareaChange({ target }));
      expect(target.style.height).toBe('160px');
    });

    it('appends a picked emoji to the text', async () => {
      const { result } = await mountFeed();
      typeMessage(result, 'hi ');

      act(() => result.current.onEmojiClick({ emoji: '🦆' }));

      expect(result.current.newMessage).toBe('hi 🦆');
    });

    it('closes the emoji picker on a click outside it, but not inside', async () => {
      const { result } = await mountFeed();
      const inside = document.createElement('div');
      const outside = document.createElement('div');
      document.body.append(inside, outside);
      result.current.emojiPickerRef.current = inside;

      act(() => result.current.setShowEmojiPicker(true));
      act(() => { inside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
      expect(result.current.showEmojiPicker).toBe(true);

      act(() => { outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
      expect(result.current.showEmojiPicker).toBe(false);
      inside.remove();
      outside.remove();
    });

    it('closes the emoji picker once a message is sent', async () => {
      const { result } = await mountFeed();
      act(() => result.current.setShowEmojiPicker(true));
      typeMessage(result, 'hi');

      await act(async () => {
        await result.current.handleSendMessage();
      });

      expect(result.current.showEmojiPicker).toBe(false);
    });
  });

  describe('deleting a message', () => {
    it('deletes it on the server and removes it from the feed once confirmed', async () => {
      serveFeed({ pages: [[msg(3), msg(2), msg(1)]] });
      const { result } = await mountFeed();

      await act(async () => {
        await result.current.handleDeleteMessage(2);
      });

      expect(showConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this message?',
        expect.objectContaining({ destructive: true })
      );
      expect(client.delete).toHaveBeenCalledWith('/message/delete_message/2');
      expect(result.current.messages.map((m) => m.id)).toEqual([3, 1]);
    });

    it('does nothing when the confirmation is cancelled', async () => {
      showConfirm.mockResolvedValue(false);
      serveFeed({ pages: [[msg(2), msg(1)]] });
      const { result } = await mountFeed();

      await act(async () => {
        await result.current.handleDeleteMessage(2);
      });

      expect(client.delete).not.toHaveBeenCalled();
      expect(result.current.messages).toHaveLength(2);
    });

    it('keeps the message and says so when the server refuses', async () => {
      client.delete.mockRejectedValue(new Error('403'));
      serveFeed({ pages: [[msg(2), msg(1)]] });
      const { result } = await mountFeed();

      await act(async () => {
        await result.current.handleDeleteMessage(2);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete message');
      expect(result.current.messages).toHaveLength(2);
    });
  });
});
