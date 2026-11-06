# Database Schema - Classroom Chat

SQLite everywhere: development uses `DEV_DATABASE_URI` (default `backend/instance/dev_users.db`), production
uses `DATABASE_URL` (`prod_users.db`, set by `deploy.yml`). Production schema changes go through Alembic; see
[infrastructure_and_devops.md](infrastructure_and_devops.md#8-database-migrations).

## Tables

Tables and columns are defined in [`backend/application/models/`](../backend/application/models/); read them
there. What each table is for:

| Tables | Purpose |
| :--- | :--- |
| `users`, `parent_students` | Accounts of every role (student, parent, admin); the parent-to-student links |
| `classrooms`, `user_classrooms`, `classroom_join_attempts` | Classes (`global` and `archive` are reserved), who is in them, and the log of join-code attempts |
| `courses`, `course_instances`, `course_instance_requests` | A course, its run in a classroom, and students' requests to add one |
| `challenges`, `challenge_logs`, `level_games` | The challenge catalogue, each student's completions, and the sandbox games unlocked by progress |
| `achievement`, `user_achievement`, `user_certificate` | Badges, who earned them, and the certificates submitted for them |
| `projects`, `project_files`, `project_templates` | Student projects, their 3D model, source and asset files, and admin-defined templates |
| `skills`, `submissions`, `notes` | Profile skills, uploaded work, and note images |
| `messages`, `message_classrooms`, `message_users`, `parent_messages` | Chat messages and their classroom and user targets; parent-to-teacher messages |
| `banned_words`, `configuration` | Chat moderation words; the single row of global settings |
| `duck_transactions`, `duck_trade_log`, `store_items`, `user_item_purchases` | The duck economy: balance changes, Bit Shift trades, the shop and purchases |
| `session_logs`, `connection_attempts` | Sessions for presence and analytics; parent connect-code attempts |
| `quizzes`, `quiz_questions`, `quiz_assignments`, `quiz_attempts`, `quiz_rewards` | Student tests: see [student_tests.md](student_tests.md) |

## Rules the models and migrations cannot show at a glance

- **Cascading deletes.** Deleting a user or a classroom cascades through ORM relationships
  (`cascade="all, delete-orphan"`), so a delete does not depend on SQLite enforcing foreign keys. A parent
  message whose resolving admin is deleted stays and only loses `resolved_by_id` (`SET NULL`).
  `backend/tests/app/models/test_user_deletion.py` and `test_classroom_deletion.py` fail when a new foreign
  key to `users.id` or `classrooms.id` has no row in those tests.
- **Stored files.** A deleted `submissions` or `project_files` row takes its uploaded file with it once the
  delete commits, and a file written for a new row is removed again unless the transaction commits
  (`backend/application/utilities/stored_files.py`). Notes and project images are removed only by their own
  delete routes.
- **Held by the database** (declared on the models, added to existing databases by migrations):
    - `challenge_logs`: one row per `(user_id, challenge_slug, course_instance)`, and one per
      `(user_id, challenge_slug)` among the rows without a course instance (partial unique index).
    - `session_logs`: one open session (`end_time IS NULL`) per user (partial unique index).
    - `configuration`: a single row, `id = 1` (CHECK constraint).
    - Student-test tables: see [student_tests.md](student_tests.md).
