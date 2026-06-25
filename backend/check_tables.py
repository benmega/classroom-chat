from application import create_app
from application.extensions import db

app = create_app()
with app.app_context():
    print(db.metadata.tables.keys())
