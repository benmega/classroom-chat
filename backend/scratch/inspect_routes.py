from application import create_app
from application.config import TestingConfig

app = create_app(TestingConfig)
with app.app_context():
    print(app.url_map)
