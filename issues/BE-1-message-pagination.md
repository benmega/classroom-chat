# BE-1: Lack of Message Pagination in Chat Routes

## Description
The application retrieves conversation history without any form of pagination. In `backend/application/routes/message_routes.py`, several endpoints (e.g., `get_current_conversation`, `get_conversation`, `view_conversation`) fetch entire conversation threads using SQLAlchemy's `joinedload(Conversation.messages)` or similar. 

## Impact
- **Performance:** For long-running classroom chats with thousands of messages, this causes massive SQL queries, extreme memory bloat, and long serialization times.
- **Scalability:** The server will crash or hang when a classroom reaches a certain message threshold.

## Recommendation
Implement pagination for conversation messages (e.g., cursor-based or offset pagination). The endpoints should only fetch the most recent messages by default (e.g., `limit(50)`), and provide a way for the frontend to request older messages when scrolling up.
