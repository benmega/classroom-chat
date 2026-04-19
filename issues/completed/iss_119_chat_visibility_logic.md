# iss_119_chat_visibility_logic
**Status**: Completed
**Priority**: High
**Type**: Functional Bug

## Description
There is a reported issue where students cannot see conversations created by admins/teachers. The reviewer noted that when an admin creates a "testing" conversation, it does not appear for the student user. Additionally, there is a request for specific visibility logic: all users should see the current active conversation, but it should only persist in their history if they were an active participant.

## Requirements
- Ensure all conversations created by admins/teachers are visible to all students by default while they are the "current" conversation.
- Implement/Verify the participation logic: Conversations should only appear in a user's permanent history if they have sent at least one message in that conversation.
- Only admins/teachers should have the capability to create new conversations.

## Root Cause
The `api/conversations/<user_id>` endpoint only returned conversations where the user was explicitly listed in the `conversation_users` association table. Users were only added to this table when they sent a message (participation logic). However, the absolute latest "active" conversation was not being force-included if it was created by an admin, making newly created admin chats invisible to students until they somehow knew to join them. Additionally, there was no restriction on who could create conversations in the backend.

## Resolution
1.  **Model Change**: Added `creator_id` to the `Conversation` model to track ownership.
2.  **Database Migration**: Manually added the `creator_id` column to `dev_users.db` and `prod_users.db`.
3.  **Permission Enforcement**: Restricted the `/start_conversation` endpoint to `is_admin` users only.
4.  **Visibility Logic**: Updated `get_conversation_history` (API) and `conversation_history` (HTML) routes to:
    - Include all conversations the user has participated in (history logic).
    - Include the absolute latest conversation in the system **only if** it was created by an admin (the "current/active" public chat).
5.  **Tracking**: Updated `save_message_to_db` and `start_conversation` to correctly populate `creator_id`.

## Changed Files
- `backend/application/models/conversation.py`
- `backend/application/routes/message_routes.py`
- `backend/application/utilities/db_helpers.py`
- `backend/instance/dev_users.db` (Schema change)
- `backend/instance/prod_users.db` (Schema change)

## Verification Results
- **Participation**: Confirmed that users are only added to a conversation's participant list when they send a message.
- **Visibility**: Verified (via logic audit) that the latest admin-created conversation is now included in the fetch results for all users, regardless of participation.
- **Security**: Verified that non-admin users receive a 403 when attempting to create a conversation directly via API.

