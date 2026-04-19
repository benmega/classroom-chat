from application import create_app
from application.models.achievements import Achievement

app = create_app()
with app.app_context():
    achievements = Achievement.query.all()
    for a in achievements:
        print(f"ID: {a.id}, Slug: {a.slug}, Name: {a.name}, Type: {a.type}, Req: {a.requirement_value}, Source: {a.source}")
