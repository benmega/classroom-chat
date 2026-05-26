"""
File: migrate_classroom.py
Path: backend/tools/migrate_classroom.py
Type: py
Summary: Idempotent migration script for the multi-tenant classroom refactor.

Run once against the target database:
    cd backend
    python -m tools.migrate_classroom

The script is safe to re-run -- every step checks before acting.
"""

import os
import sys

# Allow running from the backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from sqlalchemy import text


def run():
    """Execute all migration steps inside a single application context."""
    from application import create_app
    from application.extensions import db
    from application.constants import GLOBAL_CLASSROOM_ID
    import application.constants as _constants

    app = create_app()

    with app.app_context():
        conn = db.engine.connect()

        print("=" * 60)
        print("Classroom Migration Script -- starting")
        print("=" * 60)

        # ------------------------------------------------------------------
        # Step 0: Add classroom_id to challenges table (idempotent)
        # ------------------------------------------------------------------
        print("\n[0/7] Adding classroom_id column to challenges ...")
        challenge_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(challenges)")).fetchall()]
        if "classroom_id" not in challenge_cols:
            conn.execute(text(
                "ALTER TABLE challenges ADD COLUMN classroom_id VARCHAR(64) "
                "REFERENCES classrooms(id) ON DELETE SET NULL"
            ))
            conn.commit()
            print("       [OK] Added challenges.classroom_id")
        else:
            print("       - challenges.classroom_id already exists, skipping")

        # ------------------------------------------------------------------
        # Step 0.5: Add missing columns to conversations table (idempotent)
        # ------------------------------------------------------------------
        print("\n[0.5/7] Adding columns to conversations ...")
        conv_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(conversations)")).fetchall()]
        
        if "classroom_id" not in conv_cols:
            conn.execute(text(
                "ALTER TABLE conversations ADD COLUMN classroom_id VARCHAR(64) "
                "REFERENCES classrooms(id) ON DELETE CASCADE"
            ))
            print("       [OK] Added conversations.classroom_id")
        
        if "is_locked" not in conv_cols:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN is_locked BOOLEAN DEFAULT 0"))
            print("       [OK] Added conversations.is_locked")
            
        if "slow_mode_delay" not in conv_cols:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN slow_mode_delay INTEGER DEFAULT 0"))
            print("       [OK] Added conversations.slow_mode_delay")
            
        conn.commit()

        # ------------------------------------------------------------------
        # Step 1: Create user_classrooms table (idempotent)
        # ------------------------------------------------------------------
        print("\n[1/7] Creating user_classrooms join table ...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_classrooms (
                user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                classroom_id VARCHAR(64) NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
                enrolled_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, classroom_id)
            )
        """))
        conn.commit()
        print("       [OK] user_classrooms table ready")

        # ------------------------------------------------------------------
        # Step 2: Insert reserved 'global' classroom
        # ------------------------------------------------------------------
        print("\n[2/7] Seeding 'global' classroom ...")
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
        # Step 3: Insert reserved 'archive' classroom
        # ------------------------------------------------------------------
        print("\n[3/7] Seeding 'archive' classroom ...")
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
        # Step 4: Migrate existing users.classroom_id -> user_classrooms rows
        # ------------------------------------------------------------------
        print("\n[4/7] Migrating legacy users.classroom_id -> user_classrooms ...")

        # Only attempt if the column still exists (SQLite doesn't support DROP COLUMN
        # in older versions, so the column may linger).
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if "classroom_id" in cols:
            rows = conn.execute(
                text("SELECT id, classroom_id FROM users WHERE classroom_id IS NOT NULL")
            ).fetchall()
            migrated = 0
            for user_id, cid in rows:
                # Verify the target classroom exists (skip orphaned FKs)
                valid = conn.execute(
                    text("SELECT id FROM classrooms WHERE id = :id"), {"id": cid}
                ).fetchone()
                if not valid:
                    print(f"       ⚠ Skipping user {user_id}: classroom '{cid}' not found")
                    continue

                already_enrolled = conn.execute(
                    text("SELECT 1 FROM user_classrooms WHERE user_id=:uid AND classroom_id=:cid"),
                    {"uid": user_id, "cid": cid}
                ).fetchone()
                if not already_enrolled:
                    conn.execute(
                        text("INSERT INTO user_classrooms (user_id, classroom_id, enrolled_at) "
                             "VALUES (:uid, :cid, :ts)"),
                        {"uid": user_id, "cid": cid, "ts": datetime.utcnow()}
                    )
                    migrated += 1

            conn.commit()
            print(f"       [OK] Migrated {migrated} user->classroom rows")
        else:
            print("       - users.classroom_id column not present, skipping migration")

        # ------------------------------------------------------------------
        # Step 4.1: Retroactively enroll users based on challenge_logs
        # ------------------------------------------------------------------
        print("\n[4.1/7] Retroactively enrolling users from challenge_logs ...")
        # Ensure course_instance column exists in challenge_logs
        log_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(challenge_logs)")).fetchall()]
        if "course_instance" in log_cols:
            result = conn.execute(text("""
                INSERT OR IGNORE INTO user_classrooms (user_id, classroom_id, enrolled_at)
                SELECT DISTINCT u.id, cl.course_instance, CURRENT_TIMESTAMP
                FROM users u
                JOIN challenge_logs cl ON u.username = cl.username
                JOIN classrooms c ON c.id = cl.course_instance
                WHERE cl.course_instance IS NOT NULL AND cl.course_instance != ''
            """))
            conn.commit()
            print(f"       [OK] Added {result.rowcount} enrollments from challenge_logs")
        else:
            print("       - challenge_logs.course_instance column not present, skipping")

        # ------------------------------------------------------------------
        # Step 4.2: Retroactively enroll users based on conversation participation
        # ------------------------------------------------------------------
        print("\n[4.2/7] Retroactively enrolling users from conversation_users ...")
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
            print(f"       [OK] Added {result.rowcount} enrollments from conversation_users")
        else:
            print("       - conversation_users table not present, skipping")

        # ------------------------------------------------------------------
        # Step 5: Update conversations with NULL classroom_id -> 'archive'
        # ------------------------------------------------------------------
        print("\n[5/7] Archiving orphaned conversations (classroom_id IS NULL) ...")
        result = conn.execute(
            text("UPDATE conversations SET classroom_id = 'archive' WHERE classroom_id IS NULL")
        )
        conn.commit()
        print(f"       [OK] Updated {result.rowcount} conversation(s) to classroom 'archive'")

        # ------------------------------------------------------------------
        # Step 6: Seed the canonical Global Announcement conversation
        # ------------------------------------------------------------------
        print("\n[6/7] Seeding global conversation ...")
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

        # Write the ID back into the module-level constant so a running app
        # can pick it up immediately after migration without a restart.
        _constants.GLOBAL_CONVERSATION_ID = global_conv[0]
        print(f"       [OK] GLOBAL_CONVERSATION_ID = {global_conv[0]}")

        # ------------------------------------------------------------------
        # Step 7: Enforce NOT NULL on conversations.classroom_id (SQLite work-around)
        # ------------------------------------------------------------------
        # SQLite does not support ALTER COLUMN constraints.  The model already
        # declares nullable=False; SQLAlchemy will enforce this at ORM level.
        # For strict enforcement at the DB level on SQLite you would need to
        # recreate the table -- deliberately skipped here to avoid data risk.
        # On PostgreSQL the column will already be NOT NULL from the model.
        print("\n[7/7] NOT NULL enforcement note ...")
        print("       - ORM-level constraint active (nullable=False on Conversation.classroom_id)")
        print("       - SQLite: DB-level constraint requires table recreation (deferred)")

        conn.close()

        print("\n" + "=" * 60)
        print("Migration complete [OK]")
        print("=" * 60)


if __name__ == "__main__":
    run()
