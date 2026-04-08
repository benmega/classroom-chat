# Bug: Chat Sender Attribution Error

## Description
In the chat interface, all messages are displayed with the sender name "Mr. Mega" and the admin's avatar, regardless of who actually sent the message. This makes it impossible to distinguish between different participants in a conversation.

## Steps to Reproduce
1. Log in as a student (e.g., `blossomstudent01`).
2. Send a message in a chat.
3. Observe the sender name and avatar for the newly sent message.

## Expected Result
The message should show the student's name (`blossomstudent01`) and their specific avatar.

## Actual Result
The message shows "Mr. Mega" and the admin avatar.

## Impact
**Critical.** Core functionality of the chat app is compromised as users cannot identify each other.

## Screenshots
![Chat Attribution Error](C:\Users\Ben\.gemini\antigravity\brain\19dba842-3e02-4ebc-adb6-49c9486e16ba\student_chat_test_1775550003731.png)
