# Unnecessary Re-renders in Chat Message List

## Description
The `ChatMessage` component (`frontend/src/components/chat/ChatMessage.jsx`) is rendered inside `Chat.jsx` within a list of `messages`. Currently, `ChatMessage` does not use `React.memo()`. Whenever a new message arrives, the `messages` array updates, causing the entire message list to re-render. In a chat application, rendering hundreds of messages on every update can cause significant performance degradation and layout thrashing. 

Additionally, the `onDelete` prop passed to `ChatMessage` in `Chat.jsx` is not stable unless wrapped in `useCallback` or `ChatMessage` skips evaluating it. The `messages` are updated continuously, and missing memoization multiplies the render cycles unnecessarily.

## Location
- `frontend/src/components/chat/ChatMessage.jsx`
- `frontend/src/pages/Chat/Chat.jsx`

## Proposed Fix
- Wrap `ChatMessage` with `React.memo()` and provide a custom equality function if needed.
- Ensure the `onDelete` handler passed to it is wrapped with `useCallback` in `useChatLogic.js`/`Chat.jsx` to prevent breaking the memoization.
