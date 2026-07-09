# Chat Feed Long String Overflow

## Description
In the chat feed, very long continuous strings without spaces (e.g., from user "Nani") fail to wrap and overflow the message container boundaries.

## Steps to Reproduce
1. Navigate to `/chat`.
2. Post or view a message with an extremely long unbroken string (e.g., "monokuma..." or "HAHAHA...").

## Expected Result
The text should wrap to the next line (`word-break: break-all` or `overflow-wrap: break-word`).

## Actual Result
The string stretches horizontally, breaking the chat bubble bounds and causing overflow.

## Impact
Medium - Breaks layout.

## Screenshots
![Chat Feed Overflow](file:///C:/Users/Ben/.gemini/antigravity/brain/d5795b34-a7bc-4bbb-b110-494656adce59/chat-feed-scroll.png)

## Technical Analysis & Proposed Fix
* **Root Cause**:
  - The text container has `word-break: break-word` and `overflow-wrap: anywhere`, but the parent flex containers (`.message-row` and `.chat-message-group`) default to `min-width: auto`.
  - Under CSS Flexbox rules, flex items will expand to fit long unbroken words if `min-width` is not explicitly set to `0`.
* **Proposed CSS & Code Fix**:
  - Add `min-width: 0;` to `.message-row` and `.chat-message-group` in `Chat.css` to allow the containers to shrink below their child elements' default size, forcing text wrapping to occur.

## Root Cause
As analyzed, `.message-row` and `.chat-message-group` flex containers needed `min-width: 0` to shrink correctly and allow `word-break` to work on `.message-bubble`.

## Changed Files
- `frontend/src/pages/Chat/Chat.css`
