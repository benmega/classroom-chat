from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    is_ai_teacher = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<User {self.username}>'
