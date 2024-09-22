from application.extensions import db

class Conversation(db.Model):
    __tablename__ = 'conversations'  # Specify the table name
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(500))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Corrected ForeignKey reference
