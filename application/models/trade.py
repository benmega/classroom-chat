from datetime import datetime
from application.extensions import db

class Trade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    digital_ducks_traded = db.Column(db.Integer, nullable=False)
    duck_breakdown = db.Column(db.JSON, nullable=False)  # Combined bit and byte breakdown
    duck_type = db.Column(db.String(4), nullable=False)  # 'bit' or 'byte'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref='trades')
