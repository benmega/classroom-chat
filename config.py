import os
from dotenv import load_dotenv

'''
    Extra credit if you can see what's wrong here!
'''
class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INSTANCE_FOLDER = os.path.join(BASE_DIR, 'instance')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'server', 'templates')
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.getenv("DATABASE_PATH", os.path.join(INSTANCE_FOLDER, "users.db"))}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret-key')