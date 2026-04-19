from application import create_app
from application.models.achievements import Achievement

app = create_app()
with app.app_context():
    slugs = [a.slug for a in Achievement.query.all()]
    print(slugs)
