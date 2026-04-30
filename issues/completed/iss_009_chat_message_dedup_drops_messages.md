# ISS-009: Chat Message Deduplication Uses Timing Heuristic, Causing Real Messages to Be Dropped

**Type:** Functionality / Data Loss  
**Severity:** High  
**Status:** Open  
**Reported:** 2026-04-23

---

## Summary

The `onMessageReceived` handler in `Chat.jsx` attempts to deduplicate incoming socket messages using a heuristic: messages with the same `content`, `username`, AND within 1 second of each other are treated as duplicates and discarded.

This logic is too aggressive. If two different users (or the same user) legitimately send the same text within 1 second (e.g., both typing "ok" or spamming a key), the second message is silently dropped from the UI.

---

## Affected File

`frontend/src/pages/Chat/Chat.jsx`, lines 61–64 and 77–80:
```js
const msgExists = conv.messages?.some(m =>
  (m.content === data.content && m.username === data.username && 
   Math.abs(new Date(m.timestamp) - new Date(data.timestamp)) < 1000)
);
if (msgExists) return conv;
```

---

## Steps to Reproduce

1. Open the chat as User A.
2. Send "ok" twice in rapid succession (< 1 second apart).
3. The second "ok" does not appear in the chat UI (though it was saved to the DB).
4. Refresh the page — both messages appear.

---

## Impact

- **Silent message loss**: Real messages disappear from the UI without any error.
- The deduplication pattern was intended to prevent socket echo but its timing window is too wide.
- The root cause is that sent messages have no stable unique ID from the backend — the fix should assign message IDs and deduplicate by ID, not by content+time.

---

## Recommended Fix

1. Have the backend emit a unique `message_id` in the `message_received` socket payload.
2. Deduplicate using `message_id` instead of the timing heuristic:
```js
const msgExists = prev.some(m => m.id === data.id);
if (msgExists) return prev;
```
