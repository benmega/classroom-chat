# Database Schema - Classroom Chat

This document details the relational database schema, tables, and relationships within the Classroom Chat project. The tables are defined in `backend/application/models/` (SQLAlchemy ORM); when in doubt the models are the source of truth.

## 1. Overview
The project uses SQLite (in both local development and production) managed through the **SQLAlchemy ORM**.

- **Development / testing**: SQLite (`DEV_DATABASE_URI`, default `backend/instance/dev_users.db`).
- **Production**: `DATABASE_URL`, set by `deploy.yml` to the SQLite file `backend/instance/prod_users.db`.
- **Schema management**: production schema changes go through Alembic (`backend/migrations/`,
  applied by `deploy.sh` with `flask db upgrade`, followed by `python -m tools.migrate_classroom`).
  `db.create_all()` is only run outside production (`application/__init__.py`).

---

## 2. Core Tables

### 2.1 Users (`users`)
The central entity for authentication and student tracking.
- **Primary Key**: `id` (Integer)
- **Identity**: `username` (Unique; the attribute is `_username`), `nickname`, `slug` (Unique), `bio`
- **Auth**: `password_hash`
- **Metadata**: `profile_picture`, `ip_address`, `is_online`, `is_admin`, `is_approved`, `created_at`
- **Gamification**: `duck_balance`, `earned_ducks`, `packets`, `last_daily_duck`, `last_achievement_evaluation`

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
- **`achievement`**: Defined badges/milestones.
    - Fields: `id`, `slug` (Unique), `name`, `type`, `reward`, `description`, `requirement_value`, `source`.
- **`user_achievement`**: Pivot table marking which users have which badges.
    - Fields: `id`, `user_id` (FK), `achievement_id` (FK), `earned_at`.
- **`duck_trades` / `duck_transactions`**: History of currency transfers between students and system adjustments.
    - Fields: `id`, `from_user_id`, `to_user_id`, `amount`, `timestamp`, `status`.

### 2.5 User Portfolio & Submissions
- **`projects`**: Student-created projects.
    - Fields: `id`, `name`, `description`, `link`, `user_id` (FK), `teacher_comment`, `code_snippet`, `github_link`, `video_url`, `video_transcript`, `image_url`.
- **`project_templates`**: Admin-defined project outlines that students can instantiate.
    - Fields: `id`, `title`, `description`, `template_repo`.
- **`skills`**: Individual skills listed on user profiles.
    - Fields: `id`, `name`, `user_id` (FK), `category` (language/tool/concept), `icon`, `proficiency` (1 bronze, 2 silver, 3 gold).
- **`user_certificates`**: Official milestones or external certs.
    - Fields: `id`, `user_id` (FK), `certificate_type`, `issued_at`.
- **`submissions`**: Student submissions for projects or assignments.
    - Fields: `id`, `user_id` (FK), `project_id` (FK), `status`, `submitted_at`.

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
- **`course_instance_requests`**: Student requests to join a specific course instance.
    - Fields: `id`, `user_id` (FK), `course_instance_id` (FK), `status`.
- **`classroom_join_attempts`**: Logs of students attempting to join a classroom via code.
    - Fields: `id`, `user_id` (FK), `join_code`, `success`.

### 2.8 Roles & Connections
- **`parent_students`**: Linking parent accounts to their children's accounts.
    - Fields: `parent_id` (FK), `student_id` (FK).

### 2.9 System, Moderation & Logging
- **`notes`**: Private teacher notes attached to a user profile.
    - Fields: `id`, `user_id` (FK), `author_id` (FK), `content`, `created_at`.
- **`banned_words`**: List of prohibited words for chat moderation.
    - Fields: `id`, `word`, `severity`.
- **`ai_settings` / `configuration`**: Global settings and AI toggles.
- **`session_logs`**: Tracking user sessions for analytics.
    - Fields: `id`, `user_id` (FK), `login_time`, `logout_time`.
- **`connection_attempts`**: Logging of login attempts.
    - Fields: `id`, `username`, `ip_address`, `success`, `timestamp`.


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
- **Users <-> Achievements**: Users earn many achievements; achievements are earned by many users. (Handled by `user_achievement`).
- **Parents <-> Students**: A parent can have multiple students; a student can have multiple parents. (Handled by `parent_student`).
- **Users <-> Conversations**: Participants in a chat. (Generally handled by the `messages` table association or a dedicated `participants` table if implemented).

---

## 4. Integrity & Hooks
- **Slugging**: `before_insert` event on the `User` model automatically generates unique URL-friendly slugs from nicknames.
- **Cascading Deletes**: Relationships like `achievements` and `notes` are configured with `cascade="all, delete-orphan"` to ensure cleanup when a user is removed.
