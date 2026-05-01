# Database Schema - Classroom Chat

This document details the relational database schema, tables, and relationships within the Classroom Chat project.

## 1. Overview
The project uses a relational database (typically SQLite for local development and PostgreSQL for production) managed through the **SQLAlchemy ORM**.

---

## 2. Core Tables

### 2.1 Users (`users`)
The central entity for authentication and student tracking.
- **Primary Key**: `id` (Integer)
- **Identity**: `username` (Unique), `nickname`, `slug` (Unique)
- **Auth**: `password_hash`
- **Metadata**: `profile_picture`, `ip_address`, `is_online`, `is_admin`, `is_approved`, `created_at`
- **Gamification**: `duck_balance`, `earned_ducks`, `packets`, `last_daily_duck`

### 2.2 Conversations & Messages
- **`conversations`**: Stores chat rooms / thread metadata.
    - Fields: `id`, `title`, `created_at`.
- **`messages`**: Link between users and conversations.
    - Fields: `id`, `content`, `timestamp`, `user_id` (FK), `conversation_id` (FK), `is_ai` (Boolean).

### 2.3 Progress & Challenges
- **`challenges`**: Master list of available challenges/tasks.
    - Fields: `id`, `name`, `domain` (e.g., CodeCombat), `level_slug`.
- **`challenge_logs`**: Tracking completion of challenges per user.
    - Fields: `id`, `username` (FK), `challenge_slug`, `timestamp`, `domain`.

### 2.4 Gamification
- **`achievements`**: Defined badges/milestones.
    - Fields: `id`, `name`, `description`, `icon`, `points`.
- **`user_achievements`**: Pivot table marking which users have which badges.
    - Fields: `id`, `user_id` (FK), `achievement_id` (FK), `earned_at`.
- **`duck_trade_logs`**: History of currency transfers and adjustments.
    - Fields: `id`, `from_user`, `to_user`, `amount`, `timestamp`, `reason`.

### 2.5 User Portfolio
- **`projects`**: Student-created projects.
    - Fields: `id`, `name`, `description`, `link`, `user_id` (FK).
- **`skills`**: Individual skills listed on user profiles.
    - Fields: `id`, `name`, `user_id` (FK).
- **`user_certificates`**: Official milestones or external certs.
    - Fields: `id`, `user_id` (FK), `certificate_type`, `issued_at`.

---

## 3. Relationships

### One-to-Many
- **User -> Projects**: One student can have multiple portfolio items.
- **User -> Skills**: One student can list multiple skills.
- **User -> Messages**: One user authors many individual messages.
- **Conversation -> Messages**: One thread contains many messages.

### Many-to-Many (via Pivot Tables)
- **Users <-> Achievements**: Users earn many achievements; achievements are earned by many users. (Handled by `user_achievements`).
- **Users <-> Conversations**: Participants in a chat. (Generally handled by the `messages` table association or a dedicated `participants` table if implemented).

---

## 4. Integrity & Hooks
- **Slugging**: `before_insert` event on the `User` model automatically generates unique URL-friendly slugs from nicknames.
- **Cascading Deletes**: Relationships like `achievements` and `notes` are configured with `cascade="all, delete-orphan"` to ensure cleanup when a user is removed.
