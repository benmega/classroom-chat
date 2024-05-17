from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), unique=True, nullable=False)
    username = db.Column(db.String(80), nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'
