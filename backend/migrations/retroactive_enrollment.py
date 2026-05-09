"""
File: retroactive_enrollment.py
Type: py
Summary: Migrates existing challenge completion logs into classroom enrollments.
         Students who have successfully submitted a challenge belonging to a 
         classroom are retroactively enrolled in that classroom.
"""

import sys
import os

# Add the backend directory to sys.path so we can import application
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from application import create_app
from application.extensions import db
from application.models.user import User
from application.models.challenge import Challenge
from application.models.challenge_log import ChallengeLog
from application.models.classroom import user_classrooms, Classroom
from sqlalchemy import select, insert

def run_retroactive_enrollment():
    app = create_app()
    with app.app_context():
        print("--- Starting Retroactive Classroom Enrollment ---")
        
        # 1. Get all unique (username, classroom_id) pairs from successful submissions
        # We join ChallengeLog and Challenge on the slug
        query = (
            db.session.query(User.id, Challenge.classroom_id)
            .join(ChallengeLog, User._username == ChallengeLog.username)
            .join(Challenge, ChallengeLog.challenge_slug == Challenge.slug)
            .filter(Challenge.classroom_id != None)
            .distinct()
        )
        
        enrollments = query.all()
        print(f"Found {len(enrollments)} potential enrollments based on past challenge logs.")
        
        count = 0
        skipped = 0
        for user_id, classroom_id in enrollments:
            # Check if enrollment already exists to maintain idempotency
            exists = db.session.execute(
                select(user_classrooms.c.user_id)
                .where(
                    user_classrooms.c.user_id == user_id,
                    user_classrooms.c.classroom_id == classroom_id
                )
            ).first()
            
            if not exists:
                try:
                    db.session.execute(
                        insert(user_classrooms).values(
                            user_id=user_id,
                            classroom_id=classroom_id
                        )
                    )
                    count += 1
                except Exception as e:
                    print(f"Error enrolling user {user_id} in {classroom_id}: {e}")
            else:
                skipped += 1
        
        db.session.commit()
        print(f"Successfully retroactively enrolled {count} students.")
        print(f"Skipped {skipped} existing enrollments.")
        print("--- Retroactive Enrollment Complete ---")

if __name__ == "__main__":
    run_retroactive_enrollment()
