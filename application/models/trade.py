from datetime import datetime
from application.extensions import db

class Trade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    digital_ducks_traded = db.Column(db.Integer, nullable=False)
    bit_ducks = db.Column(db.JSON, nullable=False)  # Store bit duck breakdown as JSON
    byte_ducks = db.Column(db.JSON, nullable=False)  # Store byte duck breakdown as JSON
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref='trades')
