from application import create_app
from application.extensions import db
from application.models.challenge import Challenge
from application.models.project_template import ProjectTemplate
from application.models.course import Course

def seed_3d_modeling():
    app = create_app()
    with app.app_context():
        # Clean up old data
        Challenge.query.filter_by(domain="3d-modeling").delete()
        Course.query.filter_by(domain="3d-modeling").delete()
        old_templates = ProjectTemplate.query.filter(ProjectTemplate.chapter.in_([
            "How 3D Printers Work", "Name Tag Model", "Codementum",
            "Real Object Modeling 1", "Real Object Modeling 2", "Real Object Modeling 3",
            "The \"Snowman\" Challenge", "Holes & Subtraction", "Booleans & Holes", "Revolve & Spin"
        ])).delete(synchronize_session=False)
        db.session.commit()

        courses_data = [
            {"id": "3d-1", "name": "TinkerCAD 1"},
            {"id": "3d-2", "name": "Blender 1"},
        ]

        for c in courses_data:
            course = Course(id=c["id"], name=c["name"], domain="3d-modeling")
            db.session.add(course)

        db.session.commit()

        challenges_data = [
            {"name": "How 3D Printers Work", "course_id": "3d-1"},
            {"name": "Name Tag Model", "course_id": "3d-1"},
            {"name": "Holes & Subtraction", "course_id": "3d-1"},
            {"name": "The \"Snowman\" Challenge", "course_id": "3d-1"},
            {"name": "Booleans & Holes", "course_id": "3d-1"},
            {"name": "Revolve & Spin", "course_id": "3d-1"},
            
            {"name": "Intro to Blender", "course_id": "3d-2"},
            {"name": "The Donut", "course_id": "3d-2"},
            {"name": "Animation Basics", "course_id": "3d-2"},
        ]

        for idx, ch in enumerate(challenges_data):
            challenge = Challenge(
                name=ch["name"],
                slug=ch["name"].lower().replace(' ', '-').replace('"', ''),
                domain="3d-modeling",
                difficulty="medium",
                value=1,
                sequence=idx+1,
                course_id=ch["course_id"]
            )
            db.session.add(challenge)
            
            pt = ProjectTemplate(
                name=ch["name"],
                description=f"Project for {ch['name']}.",
                chapter="TinkerCAD 1" if ch["course_id"] == "3d-1" else "Blender 1"
            )
            db.session.add(pt)

        db.session.commit()
        print("Seeded new 3D modeling structure.")

if __name__ == "__main__":
    seed_3d_modeling()
