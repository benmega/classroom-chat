"""fix_achievement_mismatches

Revision ID: 694097f8bfbf
Revises: 114833c64c05
Create Date: 2026-07-04 22:08:48.296305

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "694097f8bfbf"
down_revision = "114833c64c05"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Update requirement values
    op.execute(
        "UPDATE achievement SET requirement_value = '480' WHERE slug = 'you-there'"
    )
    op.execute(
        "UPDATE achievement SET requirement_value = '10' WHERE slug = '10-messages'"
    )
    op.execute(
        "UPDATE achievement SET requirement_value = '50' WHERE slug = '50-messages'"
    )

    # 2. Cleanup user achievements for users who no longer meet criteria
    conn = op.get_bind()

    # Dynamic ID lookups
    def get_ach_id(slug):
        res = conn.execute(
            sa.text("SELECT id FROM achievement WHERE slug = :slug"), {"slug": slug}
        ).fetchone()
        return res[0] if res else None

    yt_id = get_ach_id("you-there")
    cb_id = get_ach_id("10-messages")
    td_id = get_ach_id("50-messages")

    from datetime import datetime

    def parse_dt(val):
        if not val:
            return None
        if isinstance(val, datetime):
            return val
        val_str = str(val).split(".")[0]
        try:
            return datetime.strptime(val_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                return datetime.fromisoformat(str(val))
            except ValueError:
                return None

    # Cleanup 'you-there'
    if yt_id is not None:
        users_with_badge = conn.execute(
            sa.text(
                "SELECT user_id FROM user_achievement WHERE achievement_id = :ach_id"
            ),
            {"ach_id": yt_id},
        ).fetchall()

        for row in users_with_badge:
            user_id = row[0]
            logs = conn.execute(
                sa.text(
                    "SELECT start_time, end_time, last_seen FROM session_logs WHERE user_id = :user_id"
                ),
                {"user_id": user_id},
            ).fetchall()

            max_mins = 0.0
            for log in logs:
                start = parse_dt(log[0])
                end = parse_dt(log[1]) or parse_dt(log[2]) or datetime.utcnow()
                if start and end:
                    dur = (end - start).total_seconds() / 60.0
                    if dur > max_mins:
                        max_mins = dur

            if max_mins < 480.0:
                conn.execute(
                    sa.text(
                        "DELETE FROM user_achievement WHERE user_id = :user_id AND achievement_id = :ach_id"
                    ),
                    {"user_id": user_id, "ach_id": yt_id},
                )

    # Cleanup '10-messages' (Chatterbox)
    if cb_id is not None:
        users_with_chatterbox = conn.execute(
            sa.text(
                "SELECT user_id FROM user_achievement WHERE achievement_id = :ach_id"
            ),
            {"ach_id": cb_id},
        ).fetchall()

        for row in users_with_chatterbox:
            user_id = row[0]
            msg_count = conn.execute(
                sa.text("SELECT COUNT(*) FROM messages WHERE user_id = :user_id"),
                {"user_id": user_id},
            ).scalar()

            if msg_count < 10:
                conn.execute(
                    sa.text(
                        "DELETE FROM user_achievement WHERE user_id = :user_id AND achievement_id = :ach_id"
                    ),
                    {"user_id": user_id, "ach_id": cb_id},
                )

    # Cleanup '50-messages' (Talkative Duck)
    if td_id is not None:
        users_with_talkative = conn.execute(
            sa.text(
                "SELECT user_id FROM user_achievement WHERE achievement_id = :ach_id"
            ),
            {"ach_id": td_id},
        ).fetchall()

        for row in users_with_talkative:
            user_id = row[0]
            msg_count = conn.execute(
                sa.text("SELECT COUNT(*) FROM messages WHERE user_id = :user_id"),
                {"user_id": user_id},
            ).scalar()

            if msg_count < 50:
                conn.execute(
                    sa.text(
                        "DELETE FROM user_achievement WHERE user_id = :user_id AND achievement_id = :ach_id"
                    ),
                    {"user_id": user_id, "ach_id": td_id},
                )


def downgrade():
    op.execute(
        "UPDATE achievement SET requirement_value = '180' WHERE slug = 'you-there'"
    )
    op.execute(
        "UPDATE achievement SET requirement_value = '5' WHERE slug = '10-messages'"
    )
    op.execute(
        "UPDATE achievement SET requirement_value = '10' WHERE slug = '50-messages'"
    )
