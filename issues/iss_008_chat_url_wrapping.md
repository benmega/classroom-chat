# ISSUE-008: Chat URL Wrapping

## Status: Open
## Priority: Medium
## Category: UI / Chat

### Description
Long URLs shared in the chat do not wrap within the message bubble. This causes the message bubble to expand horizontally, potentially pushing the sidebar or other UI elements out of view or creating an ugly horizontal scroll.

### Steps to Reproduce
1. Log in.
2. Navigate to Chat.
3. Paste a very long URL (e.g., 200+ characters) into the chat.

### Expected Behavior
The URL should wrap to the next line or be truncated with `overflow-wrap: break-word` or `word-break: break-all`.

### Actual Behavior
The bubble expands indefinitely based on text length.
