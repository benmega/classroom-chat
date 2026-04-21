# Issue: Add Primary Database Indices for Performance

## Description
The `messages` and `user_achievements` tables currently lack indices on frequently queried foreign keys. Specifically, `Message.conversation_id`, `Message.user_id`, and `UserAchievement.user_id` do not have explicit indices. This causes SQLite to perform full table scans for these common lookups, which will degrade performance as the database grows.

## Proposed Solution
Add indices to the following columns in their respective SQLAlchemy models:
- **Messages**: `conversation_id`, `user_id`, and `created_at`.
- **UserAchievements**: `user_id`, `achievement_id`.
- **SessionLogs**: `user_id`.

A migration script update (or a separate migration) will be required to apply these to the production SQLite database.

## Acceptance Criteria
- [ ] SQLAlchemy models updated with `index=True`.
- [ ] Migration script updated to apply `CREATE INDEX` statements to existing tables.
- [ ] Fetching messages for a specific conversation remains fast even as total message count increases.

## Priority
High (Quick Win)
