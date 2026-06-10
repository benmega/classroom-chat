import sys
import os

# Ensure the backend directory is in the sys.path
backend_path = os.path.dirname(os.path.abspath(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Imports must follow the sys.path setup above so the application package resolves.
from application import create_app, db  # noqa: E402
from application.models.course import Course  # noqa: E402
from application.models.challenge import Challenge  # noqa: E402
from application.models.configuration import Configuration  # noqa: E402
from sqlalchemy import func  # noqa: E402

app = create_app()

with app.app_context():
    config = Configuration.query.first()
    duck_multiplier = config.duck_multiplier if config else 1.0
    
    results = db.session.query(
        Course.name,
        func.avg(Challenge.value).label('avg_value'),
        func.count(Challenge.id).label('level_count')
    ).join(Challenge, Course.id == Challenge.course_id) \
     .group_by(Course.id).all()
     
    print(f"Global Duck Multiplier: {duck_multiplier}")
    print(f"{'Course Name':<40} | {'Levels':<8} | {'Avg Ducks/Level'}")
    print("-" * 75)
    
    for course_name, avg_val, count in results:
        avg_ducks = (avg_val or 0) * duck_multiplier
        print(f"{course_name:<40} | {count:<8} | {avg_ducks:.2f}")

    # Also list challenges that don't have a course_id mapped to a valid Course
    orphan_results = db.session.query(
        Challenge.course_id,
        func.avg(Challenge.value).label('avg_value'),
        func.count(Challenge.id).label('level_count')
    ).outerjoin(Course, Course.id == Challenge.course_id) \
     .filter(Course.id.is_(None)) \
     .group_by(Challenge.course_id).all()
     
    if orphan_results:
         print("\nOrphan/Unmapped Courses:")
         print("-" * 75)
         for c_id, avg_val, count in orphan_results:
             avg_ducks = (avg_val or 0) * duck_multiplier
             name = str(c_id) if c_id else "No Course ID"
             print(f"{name:<40} | {count:<8} | {avg_ducks:.2f}")
