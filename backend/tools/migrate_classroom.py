"""
File: migrate_classroom.py
Path: backend/tools/migrate_classroom.py
Type: py

DATA SEEDING ONLY — no DDL here.
────────────────────────────────────────────────────────────────────────────
This script handles the *data* side of the multi-tenant classroom setup:
seeding reserved rows, backfilling legacy enrolments, and archiving orphaned
conversations.

It is called by deploy.sh AFTER `flask db upgrade` has already applied all
schema changes (including f1a2b3c4d5e6_classroom_schema which owns the DDL
for user_classrooms, challenges.classroom_id, and conversations.classroom_id).

────────────────────────────────────────────────────────────────────────────
FOR FUTURE DEVELOPERS
────────────────────────────────────────────────────────────────────────────
• DO NOT add DDL here (ALTER TABLE, CREATE TABLE, etc.).
  All schema changes must go through Alembic:

      cd backend
      flask db migrate -m "your description here"

• This script IS safe to re-run — every step is idempotent (checks before
  inserting, uses INSERT OR IGNORE, etc.).

• To run manually against the dev database:
      cd backend
      python -m tools.migrate_classroom
"""

import os
import sys

# Allow running directly from the backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from sqlalchemy import text


def run():
    """Execute all data-seeding steps inside a single application context."""
    from application import create_app
    from application.extensions import db
    from application.constants import GLOBAL_CLASSROOM_ID
    import application.constants as _constants

    app = create_app()

    with app.app_context():
        conn = db.engine.connect()

        print("=" * 60)
        print("Classroom Data Seeding -- starting")
        print("=" * 60)

        # ------------------------------------------------------------------
        # Step 1: Seed the reserved 'global' classroom
        # ------------------------------------------------------------------
        # The 'global' classroom is the site-wide announcements feed.
        # It must exist before any conversation or challenge can reference it.
        print("\n[1/6] Seeding 'global' classroom ...")
        existing_global = conn.execute(
            text("SELECT id FROM classrooms WHERE id = :id"),
            {"id": GLOBAL_CLASSROOM_ID}
        ).fetchone()

        if not existing_global:
            conn.execute(
                text("INSERT INTO classrooms (id, name, language, url) VALUES (:id, :name, :lang, :url)"),
                {"id": GLOBAL_CLASSROOM_ID, "name": "Global Announcements", "lang": "python", "url": "global"}
            )
            conn.commit()
            print(f"       [OK] Inserted classroom id='{GLOBAL_CLASSROOM_ID}'")
        else:
            print(f"       - classroom id='{GLOBAL_CLASSROOM_ID}' already exists, skipping")

        # ------------------------------------------------------------------
        # Step 2: Seed the reserved 'archive' classroom
        # ------------------------------------------------------------------
        # Conversations with no classroom are moved here so they remain
        # accessible without breaking the NOT NULL constraint.
        print("\n[2/6] Seeding 'archive' classroom ...")
        existing_archive = conn.execute(
            text("SELECT id FROM classrooms WHERE id = 'archive'")
        ).fetchone()

        if not existing_archive:
            conn.execute(
                text("INSERT INTO classrooms (id, name, language, url) VALUES ('archive', 'Archive', 'python', 'archive')"),
            )
            conn.commit()
            print("       [OK] Inserted classroom id='archive'")
        else:
            print("       - classroom id='archive' already exists, skipping")

        # ------------------------------------------------------------------
        # Step 3: Migrate legacy users.classroom_id → user_classrooms rows
        # ------------------------------------------------------------------
        # Some older user rows have a direct classroom_id column that pre-dates
        # the many-to-many join table.  Copy those rows across if the column
        # still exists on the users table (SQLite makes column drops hard, so
        # it may linger even if the model no longer declares it).
        print("\n[3/6] Migrating legacy users.classroom_id -> user_classrooms ...")
        users_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if "classroom_id" in users_cols:
            rows = conn.execute(
                text("SELECT id, classroom_id FROM users WHERE classroom_id IS NOT NULL")
            ).fetchall()
            migrated = 0
            for user_id, cid in rows:
                # Skip if the referenced classroom no longer exists
                valid = conn.execute(
                    text("SELECT id FROM classrooms WHERE id = :id"), {"id": cid}
                ).fetchone()
                if not valid:
                    print(f"       [WARNING] Skipping user {user_id}: classroom '{cid}' not found")
                    continue

                conn.execute(
                    text(
                        "INSERT OR IGNORE INTO user_classrooms (user_id, classroom_id, enrolled_at) "
                        "VALUES (:uid, :cid, :ts)"
                    ),
                    {"uid": user_id, "cid": cid, "ts": datetime.utcnow()},
                )
                migrated += 1

            conn.commit()
            print(f"       [OK] Migrated {migrated} user->classroom rows")
        else:
            print("       - users.classroom_id column not present, skipping")

        # ------------------------------------------------------------------
        # Step 4: Retroactively enrol users from challenge_logs
        # ------------------------------------------------------------------
        # Users who completed challenges in a classroom before the join table
        # existed should be retroactively enrolled.
        #
        # NOTE: challenge_logs.username was removed in Alembic revision
        # ea3252195b40.  We now join on user_id (integer FK to users.id).
        print("\n[4/6] Retroactively enrolling users from challenge_logs ...")
        log_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(challenge_logs)")).fetchall()]
        if "course_instance" in log_cols and "user_id" in log_cols:
            result = conn.execute(text("""
                INSERT OR IGNORE INTO user_classrooms (user_id, classroom_id, enrolled_at)
                SELECT DISTINCT cl.user_id, cl.course_instance, CURRENT_TIMESTAMP
                FROM challenge_logs cl
                JOIN classrooms c ON c.id = cl.course_instance
                WHERE cl.course_instance IS NOT NULL AND cl.course_instance != ''
            """))
            conn.commit()
            print(f"       [OK] Added {result.rowcount} enrolments from challenge_logs")
        else:
            print("       - challenge_logs missing course_instance or user_id column, skipping")

        # ------------------------------------------------------------------
        # Step 5: Retroactively enrol users from conversation_users
        # ------------------------------------------------------------------
        # Users who participated in classroom conversations are also enrolled.
        print("\n[5/6] Retroactively enrolling users from conversation_users ...")
        cu_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(conversation_users)")).fetchall()]
        if cu_cols:
            result = conn.execute(text("""
                INSERT OR IGNORE INTO user_classrooms (user_id, classroom_id, enrolled_at)
                SELECT DISTINCT cu.user_id, conv.classroom_id, CURRENT_TIMESTAMP
                FROM conversation_users cu
                JOIN conversations conv ON cu.conversation_id = conv.id
                JOIN classrooms c ON c.id = conv.classroom_id
                WHERE conv.classroom_id NOT IN ('global', 'archive')
            """))
            conn.commit()
            print(f"       [OK] Added {result.rowcount} enrolments from conversation_users")
        else:
            print("       - conversation_users table not present, skipping")

        # ------------------------------------------------------------------
        # Step 6: Archive orphaned conversations and seed the global one
        # ------------------------------------------------------------------
        # Any conversation with a NULL classroom_id (left over from before the
        # schema migration) gets moved to 'archive' so the NOT NULL constraint
        # is satisfied without data loss.
        print("\n[6/6] Archiving orphaned conversations and seeding global conversation ...")
        conv_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(conversations)")).fetchall()]
        if conv_cols:
            result = conn.execute(
                text("UPDATE conversations SET classroom_id = 'archive' WHERE classroom_id IS NULL")
            )
            conn.commit()
            print(f"       [OK] Archived {result.rowcount} orphaned conversation(s)")

            # Ensure exactly one conversation exists in the global classroom.
            global_conv = conn.execute(
                text("SELECT id FROM conversations WHERE classroom_id = :cid LIMIT 1"),
                {"cid": GLOBAL_CLASSROOM_ID}
            ).fetchone()

            if not global_conv:
                conn.execute(
                    text("""
                        INSERT INTO conversations (title, classroom_id, is_locked, slow_mode_delay, created_at)
                        VALUES ('Global Announcements', :cid, 0, 0, :ts)
                    """),
                    {"cid": GLOBAL_CLASSROOM_ID, "ts": datetime.utcnow()}
                )
                conn.commit()
                global_conv = conn.execute(
                    text("SELECT id FROM conversations WHERE classroom_id = :cid LIMIT 1"),
                    {"cid": GLOBAL_CLASSROOM_ID}
                ).fetchone()
                print(f"       [OK] Created global conversation id={global_conv[0]}")
            else:
                print(f"       - global conversation already exists id={global_conv[0]}, skipping")

            # Propagate the discovered ID back to the in-process constant so that
            # any code running in the same process immediately sees the right value.
            _constants.GLOBAL_CONVERSATION_ID = global_conv[0]
            print(f"       [OK] GLOBAL_CONVERSATION_ID = {global_conv[0]}")
        else:
            print("       - conversations table not present, skipping")

        conn.close()

        print("\n" + "=" * 60)
        print("Data seeding complete [OK]")
        print("=" * 60)


if __name__ == "__main__":
    run()
