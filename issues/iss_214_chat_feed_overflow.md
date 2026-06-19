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
