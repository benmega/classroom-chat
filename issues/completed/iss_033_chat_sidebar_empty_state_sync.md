# Bug: Chat Sidebar Empty State Stale After Message

## Description
When a user sends a message in a conversation that previously showed "No messages yet" in the sidebar, the sidebar does not update immediately to show the message preview. It remains in the "No messages yet" state until a full page refresh.

## Steps to Reproduce
1. Start a new conversation.
2. Observe "No messages yet" in the sidebar.
3. Send a message.
4. Observe the sidebar preview.

## Expected Result
The sidebar should immediately update to show the first few words of the new message.

## Actual Result
The sidebar stays on "No messages yet".

## Impact
**Minor.** Confusing user experience; makes the app feel unpolished and unresponsive.
