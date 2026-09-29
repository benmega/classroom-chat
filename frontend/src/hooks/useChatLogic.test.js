import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

const captured = { onMessage: null, lifecycle: null };

vi.mock('./useChatSocket', () => ({
  default: (onMessage, _onEnrolled, lifecycle) => {
    captured.onMessage = onMessage;
    captured.lifecycle = lifecycle;
    return { sendMessage: vi.fn() };
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ search: '' }),
}));

vi.mock('../store/useAuthStore', () => ({
  default: () => ({ user: { id: 1 } }),
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('/me/context')) {
        return Promise.resolve({ data: { global_conversation_id: 1, classrooms: [] } });
      }
      return Promise.resolve({
        data: [
          { conversation_id: 1, messages: [] },
          { conversation_id: 2, messages: [] },
        ],
      });
    }),
  },
}));

import toast from 'react-hot-toast';
import { useChatLogic } from './useChatLogic';

describe('useChatLogic', () => {
  it('does not show a message for another conversation in an empty active conversation', async () => {
    const { result } = renderHook(() => useChatLogic());
    await waitFor(() => expect(result.current.activeConversation?.conversation_id).toBe(1));

    act(() => {
      captured.onMessage({ id: 10, conversation_id: 2, content: 'elsewhere' });
    });
    expect(result.current.messages).toHaveLength(0);

    act(() => {
      captured.onMessage({ id: 11, conversation_id: 1, content: 'here' });
    });
    expect(result.current.messages).toHaveLength(1);
  });

  it('shows a toast when the server rejects a message', async () => {
    renderHook(() => useChatLogic());
    act(() => {
      captured.lifecycle.onMessageError({ error: 'This conversation is locked by admin' });
    });
    expect(toast.error).toHaveBeenCalledWith('This conversation is locked by admin');
  });
});
