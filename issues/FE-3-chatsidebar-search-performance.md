# Expensive Search Filter in ChatSidebar Re-computes on Every Message

## Description
In `frontend/src/components/chat/ChatSidebar.jsx`, the `filteredConversations` `useMemo` block filters through all conversations. If a search term is active, it iterates over *every single message* (`conv.messages?.some(...)`) in every conversation to check for matches in content and participant names. 

Since the `conversations` array is updated every time a new message is received (in `useChatLogic.js`), this heavy search logic re-runs for the entire chat history on every single incoming or outgoing message. As the application scales and users accumulate more messages, this will cause significant CPU usage and freeze the UI during chat interactions.

## Location
- `frontend/src/components/chat/ChatSidebar.jsx` (Lines 43-70)

## Proposed Fix
- Throttle or debounce the search input to minimize computations during typing.
- Only recalculate the `filteredConversations` based on the search term. If `conversations` changes because a single new message was appended, ideally the search shouldn't completely recalculate over the entire history, or the messages array shouldn't trigger this unless the user is actively searching.
- Alternatively, move message-level search to a backend API call rather than doing it client-side on the entire cached message history.
