import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Chat from './Chat';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';

// ─── Mock dependencies ──────────────────────────────────────────────────────

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock socket.io-client so no real connections are attempted
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock emoji-picker-react (heavy component, not relevant to logic tests)
vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }) => (
    <div data-testid="emoji-picker">
      <button onClick={() => onEmojiClick({ emoji: '😊' })}>Pick emoji</button>
    </div>
  ),
}));

// ─── Mock useFeedLogic ──────────────────────────────────────────────────────

const mockHandleSendMessage = vi.fn((e) => e?.preventDefault?.());
const mockHandleTextareaKeyDown = vi.fn();
const mockHandleTextareaChange = vi.fn();
const mockOnEmojiClick = vi.fn();
const mockHandleDeleteMessage = vi.fn();
const mockHandleScroll = vi.fn();
const mockSetShowEmojiPicker = vi.fn();
const mockSetIsGlobal = vi.fn();
const mockSetTargetLive = vi.fn();
const mockSetTargetClassrooms = vi.fn();
const mockSetTargetUsers = vi.fn();

const buildFeedLogic = (overrides = {}) => ({
  user: { id: 1, username: 'testuser', is_admin: false },
  messages: [],
  newMessage: '',
  loading: false,
  isLoadingMore: false,
  hasMore: true,
  showEmojiPicker: false,
  setShowEmojiPicker: mockSetShowEmojiPicker,
  classrooms: [],
  users: [],
  isGlobal: false,
  setIsGlobal: mockSetIsGlobal,
  targetLive: false,
  setTargetLive: mockSetTargetLive,
  targetClassrooms: [],
  setTargetClassrooms: mockSetTargetClassrooms,
  targetUsers: [],
  setTargetUsers: mockSetTargetUsers,
  textareaRef: { current: null },
  emojiPickerRef: { current: null },
  handleSendMessage: mockHandleSendMessage,
  handleTextareaKeyDown: mockHandleTextareaKeyDown,
  handleTextareaChange: mockHandleTextareaChange,
  onEmojiClick: mockOnEmojiClick,
  handleDeleteMessage: mockHandleDeleteMessage,
  handleScroll: mockHandleScroll,
  ...overrides,
});

vi.mock('../../hooks/useFeedLogic', () => ({
  useFeedLogic: vi.fn(),
}));

import { useFeedLogic } from '../../hooks/useFeedLogic';

describe('Chat Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFeedLogic.mockReturnValue(buildFeedLogic());
  });

  // ─── Loading State ────────────────────────────────────────────────────────

  it('renders loading state when loading is true', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ loading: true }));
    renderWithProviders(<Chat />);

    expect(screen.getByText(/loading feed/i)).toBeInTheDocument();
  });

  it('does not render the feed container while loading', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ loading: true }));
    const { container } = renderWithProviders(<Chat />);

    expect(container.querySelector('.feed-container')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/what's on your mind/i)).not.toBeInTheDocument();
  });

  // ─── Main Feed Rendering ──────────────────────────────────────────────────

  it('renders the chat input area when loaded', () => {
    renderWithProviders(<Chat />);

    expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
  });

  it('renders the Post button', () => {
    renderWithProviders(<Chat />);

    expect(screen.getByRole('button', { name: /post message/i })).toBeInTheDocument();
  });

  it('renders the emoji toggle button', () => {
    renderWithProviders(<Chat />);

    expect(screen.getByTitle(/add emoji/i)).toBeInTheDocument();
  });

  it('renders the Live targeting checkbox', () => {
    renderWithProviders(<Chat />);

    expect(screen.getByTitle(/send to online users/i)).toBeInTheDocument();
  });

  it('renders "For" targeting label', () => {
    renderWithProviders(<Chat />);

    expect(screen.getByText(/^for$/i)).toBeInTheDocument();
  });

  // ─── Empty Feed State ─────────────────────────────────────────────────────

  it('shows empty message when no messages', () => {
    renderWithProviders(<Chat />);

    expect(screen.getByText(/no messages to display/i)).toBeInTheDocument();
    expect(screen.getByText(/be the first to post/i)).toBeInTheDocument();
  });

  // ─── Messages Rendering ───────────────────────────────────────────────────

  it('renders chat messages when present', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      messages: [
        {
          id: 1,
          content: 'Hello from testuser',
          user_name: 'testuser',
          user_id: 1,
          created_at: new Date().toISOString(),
          is_global: false,
        },
        {
          id: 2,
          content: 'Another message',
          user_name: 'otheruser',
          user_id: 2,
          created_at: new Date().toISOString(),
          is_global: false,
        },
      ],
    }));

    renderWithProviders(<Chat />);

    expect(screen.getByText('Hello from testuser')).toBeInTheDocument();
    expect(screen.getByText('Another message')).toBeInTheDocument();
    expect(screen.queryByText(/no messages to display/i)).not.toBeInTheDocument();
  });

  it('does not show "end of feed" when hasMore is true', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      messages: [{ id: 1, content: 'msg', user_name: 'u', user_id: 1, created_at: new Date().toISOString() }],
      hasMore: true,
    }));

    renderWithProviders(<Chat />);

    expect(screen.queryByText(/reached the end of the feed/i)).not.toBeInTheDocument();
  });

  it('shows "end of feed" message when hasMore is false and messages exist', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      messages: [{ id: 1, content: 'msg', user_name: 'u', user_id: 1, created_at: new Date().toISOString() }],
      hasMore: false,
    }));

    renderWithProviders(<Chat />);

    expect(screen.getByText(/reached the end of the feed/i)).toBeInTheDocument();
  });

  it('shows "loading more" indicator when isLoadingMore is true', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      messages: [{ id: 1, content: 'msg', user_name: 'u', user_id: 1, created_at: new Date().toISOString() }],
      isLoadingMore: true,
    }));

    renderWithProviders(<Chat />);

    expect(screen.getByText(/loading more/i)).toBeInTheDocument();
  });

  // ─── Textarea & Send ──────────────────────────────────────────────────────

  it('textarea displays newMessage value from hook', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ newMessage: 'draft text' }));
    renderWithProviders(<Chat />);

    expect(screen.getByPlaceholderText(/what's on your mind/i).value).toBe('draft text');
  });

  it('calls handleTextareaChange when textarea changes', () => {
    renderWithProviders(<Chat />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.change(textarea, { target: { value: 'new message text' } });

    expect(mockHandleTextareaChange).toHaveBeenCalledTimes(1);
  });

  it('calls handleTextareaKeyDown on keydown in textarea', () => {
    renderWithProviders(<Chat />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockHandleTextareaKeyDown).toHaveBeenCalledTimes(1);
  });

  it('Post button is disabled when newMessage is empty', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ newMessage: '' }));
    renderWithProviders(<Chat />);

    expect(screen.getByRole('button', { name: /post message/i })).toBeDisabled();
  });

  it('Post button is enabled when newMessage has content', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ newMessage: 'some text' }));
    renderWithProviders(<Chat />);

    expect(screen.getByRole('button', { name: /post message/i })).not.toBeDisabled();
  });

  it('calls handleSendMessage on form submit', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ newMessage: 'hello' }));
    renderWithProviders(<Chat />);

    const postBtn = screen.getByRole('button', { name: /post message/i });
    fireEvent.click(postBtn);

    expect(mockHandleSendMessage).toHaveBeenCalledTimes(1);
  });

  it('calls handleScroll when messages container is scrolled', () => {
    renderWithProviders(<Chat />);

    const messagesDiv = document.querySelector('.feed-messages');
    if (messagesDiv) {
      fireEvent.scroll(messagesDiv);
      expect(mockHandleScroll).toHaveBeenCalledTimes(1);
    }
  });

  // ─── Emoji Picker ─────────────────────────────────────────────────────────

  it('does not show emoji picker by default', () => {
    renderWithProviders(<Chat />);

    expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument();
  });

  it('toggles emoji picker when emoji button is clicked', () => {
    renderWithProviders(<Chat />);

    const emojiBtn = screen.getByTitle(/add emoji/i);
    fireEvent.click(emojiBtn);

    expect(mockSetShowEmojiPicker).toHaveBeenCalledWith(true);
  });

  it('renders emoji picker when showEmojiPicker is true', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ showEmojiPicker: true }));
    renderWithProviders(<Chat />);

    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('calls onEmojiClick when an emoji is picked', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ showEmojiPicker: true }));
    renderWithProviders(<Chat />);

    fireEvent.click(screen.getByText('Pick emoji'));

    expect(mockOnEmojiClick).toHaveBeenCalledWith({ emoji: '😊' });
  });

  // ─── Admin-Only Features ──────────────────────────────────────────────────

  it('does not show Global checkbox for non-admin users', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ user: { id: 1, username: 'student', is_admin: false } }));
    renderWithProviders(<Chat />);

    expect(screen.queryByTitle(/send to everyone/i)).not.toBeInTheDocument();
  });

  it('shows Global checkbox for admin users', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      user: { id: 1, username: 'admin', is_admin: true },
      users: [{ id: 2, username: 'student2' }],
    }));
    renderWithProviders(<Chat />);

    expect(screen.getByTitle(/send to everyone/i)).toBeInTheDocument();
  });

  it('calls setIsGlobal when Global checkbox is toggled', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      user: { id: 1, username: 'admin', is_admin: true },
      users: [{ id: 2, username: 'student2' }],
    }));
    renderWithProviders(<Chat />);

    const globalCheckbox = screen.getByTitle(/send to everyone/i).querySelector('input[type="checkbox"]');
    fireEvent.click(globalCheckbox);

    expect(mockSetIsGlobal).toHaveBeenCalledWith(true);
  });

  it('calls setTargetLive when Live checkbox is toggled', () => {
    renderWithProviders(<Chat />);

    const liveLabel = screen.getByTitle(/send to online users/i);
    const liveCheckbox = liveLabel.querySelector('input[type="checkbox"]');
    fireEvent.click(liveCheckbox);

    expect(mockSetTargetLive).toHaveBeenCalledWith(true);
  });

  // ─── Classrooms Dropdown ──────────────────────────────────────────────────

  it('does not render Classes dropdown when classrooms list is empty', () => {
    renderWithProviders(<Chat />);

    expect(screen.queryByText(/classes/i)).not.toBeInTheDocument();
  });

  it('renders Classes dropdown when non-global classrooms exist', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      classrooms: [{ id: 1, name: 'Math 101' }],
    }));
    renderWithProviders(<Chat />);

    // MultiSelectDropdown renders the defaultLabel "Classes"
    expect(screen.getByText(/classes/i)).toBeInTheDocument();
  });

  it('does not render "global" classroom in the dropdown', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      classrooms: [
        { id: 'global', name: 'Global' },
        { id: 1, name: 'Math 101' },
      ],
    }));
    renderWithProviders(<Chat />);

    // Only Math 101 should appear (global is filtered out)
    expect(screen.queryByText('Global')).not.toBeInTheDocument();
  });

  // ─── Placeholder personalization ──────────────────────────────────────────

  it('uses nickname in placeholder when user has one', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      user: { id: 1, username: 'testuser', nickname: 'Buddy', is_admin: false },
    }));
    renderWithProviders(<Chat />);

    expect(screen.getByPlaceholderText(/what's on your mind, buddy/i)).toBeInTheDocument();
  });

  it('falls back to username in placeholder when no nickname', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      user: { id: 1, username: 'jdoe', is_admin: false },
    }));
    renderWithProviders(<Chat />);

    expect(screen.getByPlaceholderText(/what's on your mind, jdoe/i)).toBeInTheDocument();
  });

  it('falls back to "Student" in placeholder when no user info', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({ user: null }));
    renderWithProviders(<Chat />);

    expect(screen.getByPlaceholderText(/what's on your mind, student/i)).toBeInTheDocument();
  });

  // ─── Delete message ───────────────────────────────────────────────────────

  it('renders delete button for admin on messages', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      user: { id: 1, username: 'admin', is_admin: true },
      messages: [
        {
          id: 10,
          content: 'Deletable message',
          user_name: 'someone',
          user_id: 2,
          created_at: new Date().toISOString(),
          is_global: false,
        },
      ],
    }));

    renderWithProviders(<Chat />);

    expect(screen.getByTitle(/delete post/i)).toBeInTheDocument();
  });

  it('calls handleDeleteMessage when delete button is clicked', () => {
    useFeedLogic.mockReturnValue(buildFeedLogic({
      user: { id: 1, username: 'admin', is_admin: true },
      messages: [
        {
          id: 10,
          content: 'Deletable message',
          user_name: 'someone',
          user_id: 2,
          created_at: new Date().toISOString(),
          is_global: false,
        },
      ],
    }));

    renderWithProviders(<Chat />);

    fireEvent.click(screen.getByTitle(/delete post/i));

    expect(mockHandleDeleteMessage).toHaveBeenCalledWith(10);
  });
});
