# Chat Message Timestamp Always Visible

## Description
In the chat interface, the message timestamp (e.g., "Nickname • 12:34 PM") is always visible below every message. This can create visual clutter when many messages are sent in a short period.

## Steps to Reproduce
1. Log in as a student or admin.
2. Navigate to the Chat page (`/`).
3. Select any conversation.
4. Observe the messages in the chat window.

## Expected Result
Message timestamps should ideally be hidden by default and only appear when hovering over a specific message, or at least be more subtle to reduce clutter.

## Actual Result
The timestamp is consistently rendered for every message, regardless of user interaction.

## Impact
Low - This is a minor aesthetic preference to reduce UI clutter and improve the "premium" feel.

## Screenshots
![Chat Messages](file:///C:/Users/Ben/.gemini/antigravity/brain/75d33641-9ec4-45c3-9fba-7a3056ed822c/.system_generated/click_feedback/click_feedback_1776004112493.png)

## Root Cause
The chat message timestamps were rendered in the JSX with standard inline styles that didn't account for user interaction (hover). There were no CSS classes defined to handle the conditional visibility based on hover state.

## Resolution
1.  Created `.chat-message-group` and `.chat-message-timestamp` classes in `Chat.css`.
2.  Implemented conditional visibility (`opacity: 0`, `visibility: hidden`) for timestamps, becoming visible on container hover.
3.  Refactored `Chat.jsx` message rendering to use these classes instead of static inline styles.

## Changed Files
- `frontend/src/pages/Chat/Chat.css`
- `frontend/src/pages/Chat/Chat.jsx`
