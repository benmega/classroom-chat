"""Add student status fields

Revision ID: cb217f4b8c0a
Revises: 0e51e941e868
Create Date: 2026-07-03 11:22:35.731096

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'cb217f4b8c0a'
down_revision = '0e51e941e868'
branch_labels = None
depends_on = None


def parse_time(val):
    if not val:
        return None
    if isinstance(val, str):
        val = val.strip()
        if 'T' in val:
            val = val.replace('T', ' ')
        try:
            if '.' in val:
                date_part, frac = val.split('.')
                frac = (frac + "000000")[:6]
                val = f"{date_part}.{frac}"
                return datetime.strptime(val, "%Y-%m-%d %H:%M:%S.%f")
            else:
                return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return None
    return val


def upgrade():
    # 1. Drop the obsolete table
    op.drop_table('standard_projects')

    # 2. Add columns to users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_activity', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('last_activity_time', sa.DateTime(), nullable=True))
        batch_op.drop_column('can_chat')

    # 3. Add column to projects
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))

    # 4. Retroactive backfill for student status
    bind = op.get_bind()
    students = bind.execute(sa.text("SELECT id, username FROM users WHERE role = 'student'")).fetchall()
    
    for student_id, username in students:
        # Get latest challenge log
        latest_log = bind.execute(sa.text(
            "SELECT cl.timestamp, c.name FROM challenge_logs cl "
            "JOIN challenges c ON cl.challenge_slug = c.slug "
            "WHERE cl.user_id = :user_id ORDER BY cl.timestamp DESC LIMIT 1"
        ), {"user_id": student_id}).fetchone()
        
        # Get latest project
        latest_project = bind.execute(sa.text(
            "SELECT created_at, name FROM projects WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 1"
        ), {"user_id": student_id}).fetchone()
        
        current_activity = None
        last_activity_time = None
        
        log_time = parse_time(latest_log[0]) if latest_log else None
        proj_time = parse_time(latest_project[0]) if latest_project else None
        
        if log_time and proj_time:
            if log_time > proj_time:
                current_activity = f"Working on {latest_log[1]}"
                last_activity_time = log_time
            else:
                current_activity = f"Working on project: {latest_project[1]}"
                last_activity_time = proj_time
        elif log_time:
            current_activity = f"Working on {latest_log[1]}"
            last_activity_time = log_time
        elif proj_time:
            current_activity = f"Working on project: {latest_project[1]}"
            last_activity_time = proj_time
            
        if current_activity:
            bind.execute(sa.text(
                "UPDATE users SET current_activity = :act, last_activity_time = :lat WHERE id = :user_id"
            ), {"act": current_activity, "lat": last_activity_time, "user_id": student_id})


def downgrade():
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_column('created_at')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('can_chat', sa.BOOLEAN(), nullable=True))
        batch_op.drop_column('last_activity_time')
        batch_op.drop_column('current_activity')

    op.create_table('standard_projects',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), nullable=False),
    sa.Column('description', sa.TEXT(), nullable=True),
    sa.Column('link', sa.VARCHAR(length=255), nullable=True),
    sa.Column('github_link', sa.VARCHAR(length=255), nullable=True),
    sa.Column('video_url', sa.VARCHAR(length=255), nullable=True),
    sa.Column('code_snippet', sa.TEXT(), nullable=True),
    sa.Column('image_url', sa.VARCHAR(length=255), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_standard_projects'))
    )
