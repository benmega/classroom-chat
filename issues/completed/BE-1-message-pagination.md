# BE-1: Lack of Message Pagination in Chat Routes

## Description
The application retrieves conversation history without any form of pagination. In `backend/application/routes/message_routes.py`, several endpoints (e.g., `get_current_conversation`, `get_conversation`, `view_conversation`) fetch entire conversation threads using SQLAlchemy's `joinedload(Conversation.messages)` or similar. 

## Impact
- **Performance:** For long-running classroom chats with thousands of messages, this causes massive SQL queries, extreme memory bloat, and long serialization times.
- **Scalability:** The server will crash or hang when a classroom reaches a certain message threshold.

## Recommendation
Implement pagination for conversation messages (e.g., cursor-based or offset pagination). The endpoints should only fetch the most recent messages by default (e.g., `limit(50)`), and provide a way for the frontend to request older messages when scrolling up.

## Resolution
- Modified `Conversation.messages` relationship in `conversation.py` to use `lazy="select"` instead of `joined` eager loading.
- Refactored `message_routes.py` endpoints (`get_current_conversation`, `get_conversation`, `view_conversation`, `get_historical_conversation`, and `get_conversation_history`) to query the `Message` model directly, fetching only the last 50 messages by default, or paginating with a `before_id` parameter.
- Updated the frontend `useChatLogic.js` and `Chat.jsx` to support infinite scrolling by requesting older messages via `before_id` when the user scrolls to the top of the message list.
