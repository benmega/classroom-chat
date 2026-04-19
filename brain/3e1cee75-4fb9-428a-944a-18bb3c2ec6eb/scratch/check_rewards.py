
from application import create_app, DevelopmentConfig
from application.extensions import db
from application.models.achievements import Achievement

app = create_app(DevelopmentConfig)
with app.app_context():
    achs = Achievement.query.all()
    for a in achs:
        print(f"Slug: {a.slug}, Reward: {a.reward}")
