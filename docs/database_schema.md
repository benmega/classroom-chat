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
- **`duck_trades` / `duck_transactions`**: History of currency transfers between students and system adjustments.
    - Fields: `id`, `from_user_id`, `to_user_id`, `amount`, `timestamp`, `status`.

### 2.5 User Portfolio
- **`projects`**: Student-created projects.
    - Fields: `id`, `name`, `description`, `link`, `user_id` (FK).
- **`standard_projects`** / **`project_templates`**: Admin-defined project outlines that students can instantiate.
    - Fields: `id`, `title`, `description`, `template_repo`.
- **`skills`**: Individual skills listed on user profiles.
    - Fields: `id`, `name`, `user_id` (FK).
- **`user_certificates`**: Official milestones or external certs.
    - Fields: `id`, `user_id` (FK), `certificate_type`, `issued_at`.

### 2.6 Economy & Shop
- **`store_items`**: Virtual items available for purchase with Ducks.
    - Fields: `id`, `name`, `description`, `cost`, `image_url`, `stock`.
- **`user_item_purchases`**: Log of items bought by users.
    - Fields: `id`, `user_id` (FK), `store_item_id` (FK), `purchased_at`.

### 2.7 Classrooms & Courses
- **`courses`**: Master definition of a subject (e.g., "Python 101").
    - Fields: `id`, `name`, `description`.
- **`classrooms`**: Physical or virtual locations/times for a class.
    - Fields: `id`, `name`, `capacity`.
- **`course_instances`**: A specific cohort of a Course held in a Classroom (e.g., "Python 101 - Fall 2026").
    - Fields: `id`, `course_id` (FK), `classroom_id` (FK), `start_date`, `end_date`.

### 2.8 Roles & Connections
- **`parent_student`**: Linking parent accounts to their children's accounts.
    - Fields: `id`, `parent_id` (FK), `student_id` (FK), `linked_at`.

### 2.9 System & Moderation
- **`notes`**: Private teacher notes attached to a user profile.
    - Fields: `id`, `user_id` (FK), `author_id` (FK), `content`, `created_at`.
- **`banned_words`**: List of prohibited words for chat moderation.
    - Fields: `id`, `word`, `severity`.
- **`ai_settings` / `configuration`**: Global settings and AI toggles.
- **`track_requests`**: Webhook endpoint logging.

---

## 3. Relationships

### One-to-Many
- **User -> Projects**: One student can have multiple portfolio items.
- **User -> Skills**: One student can list multiple skills.
- **User -> Messages**: One user authors many individual messages.
- **User -> Item Purchases**: A user can buy multiple items.
- **Conversation -> Messages**: One thread contains many messages.
- **Course Instance -> Students**: (Assumed via relationship) A course cohort contains multiple students.

### Many-to-Many (via Pivot Tables)
- **Users <-> Achievements**: Users earn many achievements; achievements are earned by many users. (Handled by `user_achievements`).
- **Parents <-> Students**: A parent can have multiple students; a student can have multiple parents. (Handled by `parent_student`).
- **Users <-> Conversations**: Participants in a chat. (Generally handled by the `messages` table association or a dedicated `participants` table if implemented).

---

## 4. Integrity & Hooks
- **Slugging**: `before_insert` event on the `User` model automatically generates unique URL-friendly slugs from nicknames.
- **Cascading Deletes**: Relationships like `achievements` and `notes` are configured with `cascade="all, delete-orphan"` to ensure cleanup when a user is removed.
