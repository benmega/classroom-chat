from application import create_app
from application.extensions import db
from sqlalchemy import inspect
import os

app = create_app()
with app.app_context():
    print(f"DATABASE URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    inspector = inspect(db.engine)
    columns = [c['name'] for c in inspector.get_columns('users')]
    print(f"COLUMNS in 'users': {columns}")
    if 'bio' in columns:
        print("Column 'bio' EXISTS.")
    else:
        print("Column 'bio' MISSING.")
