# ISSUE: Chat Bubble Content Clipping

## Description
Chat message bubbles do not correctly handle long text strings, particularly URLs. The text overflows the bubble boundaries or is truncated abruptly, which breaks the layout and makes links difficult to read or click. There is also no easy method for users to input multi-line messages. The current implementation utilizes a single-line text input field which lacks a mechanism for line breaks, forcing users to compose their entire message on a single line.  This needs to be fixed.

## Impact
- **Visual**: High. Chat is a core feature, and layout breakage there is very noticeable.
- **Functional**: Medium. Users may not be able to see or click the full URL.

## Reproduction Steps
1. Navigate to the chat interface.
2. Send or view a message containing a long URL (e.g., `https://www.puzzleplayground.com/math_challenge_5.html`).
3. Observe how the text clips at the edge of the bubble.

## Resolution Plan
- Add `overflow-wrap: break-word` and `word-break: break-all` to the chat bubble CSS.
- Ensure the bubble container has proper padding and max-width constraints.

## Screenshots
![Chat Clipping](file:///c:/Users/Ben/AntiGravity/classroom-chat/issues/screenshots/iss_157_chat_clipping.png)

---

## ✅ Resolution

**Status**: Completed — 2026-04-29

### Root Cause

Two separate issues were present:

1. **URL/link clipping**: The `.message-bubble` element lacked `min-width: 0` and `white-space: pre-wrap`. In a flex layout, flex children do not shrink below their intrinsic content size by default, which caused long URLs to push the bubble beyond its `max-width` constraint. Adding `min-width: 0` allows the bubble to shrink correctly, and `white-space: pre-wrap` preserves intentional newlines. The `overflow-wrap: anywhere` and `word-break: break-word` properties were already present but were ineffective without `min-width: 0`.

2. **Single-line input limitation**: The chat input was an `<input type="text">` element which cannot grow vertically or accept newlines. Users had no way to compose multi-line messages.

### Changes Made

| File | Change |
|---|---|
| `frontend/src/pages/Chat/Chat.css` | Added `min-width: 0` to `.message-row` and `.message-bubble`; added `white-space: pre-wrap` to `.message-bubble`; updated `.chat-input-form` to `align-items: flex-end`; added `resize: none`, `overflow: hidden`, `min-height`, and `max-height` to `.chat-input-field` |
| `frontend/src/pages/Chat/Chat.jsx` | Replaced `<input type="text">` with `<textarea>` that auto-resizes via JS; added `handleTextareaKeyDown` (Enter sends, Shift+Enter inserts newline); added `handleTextareaChange` for dynamic height; reset textarea height on message send |
