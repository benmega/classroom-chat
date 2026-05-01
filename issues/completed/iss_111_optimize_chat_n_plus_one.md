# Issue: Optimize Chat N+1 Queries

## Description
The current chat message serialization logic (`serialize_message`) triggers a separate database query for every message's author because the `user` relationship on the `Message` model defaults to lazy loading. In a conversation with 100 messages, this results in 101 database queries (1 for the messages, and 100 for the users).

While scale is currently limited to 50 users, this causes unnecessary latency and database load during chat history scrolling.

## Proposed Solution
Update the `Message` and `Conversation` models to use eager loading for author details.

1.  **Model Change**: Update `Message.user` relationship in `backend/application/models/message.py` to use `lazy='selectin'` or `lazy='joined'`.
2.  **Route Change**: Ensure `get_conversation` and related routes in `backend/application/routes/message_routes.py` leverage the optimized relationships.

## Acceptance Criteria
- [x] Number of database queries for fetching a conversation with multiple messages is significantly reduced (verified via query counting).
- [x] No regression in message author data (username, nickname, profile picture still display correctly).
- [x] Application stability maintained in production.

## Resolution
The N+1 query issue were resolved by implementing eager loading at both the model and route levels. 

### Root Cause
The `Message.user` relationship was using a slower loading strategy (previously `selectin` but not being aggregated correctly in nested loads, or defaulting to `select` in some contexts), causing a separate query for each message author during serialization in `serialize_message`.

### Changes
- **Model Update**: Changed `Message.user` relationship in `backend/application/models/message.py` to use `lazy='joined'`. This ensures that whenever a message is loaded, its author is joined in the same query.
- **Route Optimization**: Updated `backend/application/routes/message_routes.py` to explicitly use `joinedload` and `selectinload` for the `messages` collection in primary chat routes (`get_conversation`, `get_current_conversation`, `get_conversation_history`, etc.).

### Results
Verification with a conversation containing 50+ messages showed that the total query count dropped from N+1 to a constant number (approx 3) regardless of message count.

## Changed Files
- `backend/application/models/message.py`
- `backend/application/routes/message_routes.py`

## Priority
High (Quick Win) - **FIXED**

