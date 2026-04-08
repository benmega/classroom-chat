import sys
import os

sys.path.append('c:\\Users\\Ben\\AntiGravity\\classroom-chat\\backend')

from application import create_app
app = create_app()
with app.app_context():
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.rule}")
