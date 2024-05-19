from application.extensions import db


class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(500))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
