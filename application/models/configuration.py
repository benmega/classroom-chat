from application.extensions import db


class Configuration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ai_teacher_enabled = db.Column(db.Boolean, default=False)
    message_sending_enabled = db.Column(db.Boolean, default=False)
    duck_multiplier = db.Column(db.Float, default=1)
