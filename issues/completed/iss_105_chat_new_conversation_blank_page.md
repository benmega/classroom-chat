# iss_105_chat_new_conversation_blank_page
**Status**: Open
**Priority**: High
**Type**: Bug

## Description
When logged in as an admin, navigating to the Chat view and clicking the `+` (New Conversation) button results in a blank page instead of the expected UI.

## Console Output
The following error is outputted in the console when this occurs:
`Uncaught reference X is not defined at chat chat.jsx line 362 character 18.`

## Steps to Reproduce
1. Log in as an admin.
2. Navigate to the Chat page.
3. Click the `+` icon to start a new conversation.
4. Observe the blank page and verify the console error.
