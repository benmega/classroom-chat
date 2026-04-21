# Issue: Audit and Replace render_template in Message Routes (iss_134)

## Description
A systematic audit of `backend/application/routes/message_routes.py` has identified routes that still use `render_template` for server-side rendering. These should be replaced with JSON responses to support the React frontend.

## Routes Identified
| Route | Function | Lines | Template |
|-------|----------|-------|----------|
| `/conversation_history` | `conversation_history()` | 221 | `chat/conversation_history.html` |
| `/view_conversation/<int:conversation_id>` | `view_conversation()` | 275 | `chat/view_conversation.html` |

## Proposed Fix
1. Convert these routes to return JSON data.
2. Ensure the React frontend has corresponding components to consume this data and display conversation history and individual conversations.
3. Redirect legacy URL access to the frontend chat application.

## Files Involved
- `backend/application/routes/message_routes.py`
