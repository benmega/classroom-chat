
from application.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    is_online = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        """Generate a hashed password and store it"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check the given password against the stored hash"""
        return check_password_hash(self.password_hash, password)

    @classmethod
    def set_online(cls, user_id, online=True):
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.is_online = online
            db.session.commit()