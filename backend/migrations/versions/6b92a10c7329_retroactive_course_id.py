"""retroactive_course_id

Revision ID: 6b92a10c7329
Revises: 58bd2b4d4732
Create Date: 2026-06-07 14:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6b92a10c7329'
down_revision = '58bd2b4d4732'
branch_labels = None
depends_on = None

def upgrade():
    # Update challenge_logs to fill in missing course_ids based on challenges table
    op.execute("""
        UPDATE challenge_logs
        SET course_id = (
            SELECT course_id 
            FROM challenges 
            WHERE challenges.slug = challenge_logs.challenge_slug 
            AND course_id IS NOT NULL 
            AND course_id != ''
        )
        WHERE (course_id IS NULL OR course_id = '')
        AND EXISTS (
            SELECT 1 
            FROM challenges 
            WHERE challenges.slug = challenge_logs.challenge_slug 
            AND course_id IS NOT NULL 
            AND course_id != ''
        );
    """)

def downgrade():
    # Downgrade cannot reliably know which records were previously NULL,
    # so we do nothing here to preserve the data integrity.
    pass
