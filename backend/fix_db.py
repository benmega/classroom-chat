import sys
import os

# Ensure the app context is available
sys.path.insert(0, os.path.abspath('.'))

from application import create_app
from application.extensions import db
from application.models.store_item import StoreItem

app = create_app()

with app.app_context():
    items = StoreItem.query.all()
    for item in items:
        if item.is_crowdfunded:
            item.is_crowdfunded = False
            print(f"Updated {item.name}")
    db.session.commit()
    print("Database updated.")
