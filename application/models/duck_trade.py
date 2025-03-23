from application.extensions import db


class DuckTradeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), db.ForeignKey('users.username'), nullable=False)
    digital_ducks = db.Column(db.Integer, nullable=False)
    bit_ducks = db.Column(db.PickleType, nullable=False)  # Store bit duck counts as a list
    byte_ducks = db.Column(db.PickleType, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending, approved, rejected
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())

    def approve(self):
        self.status = "approved"
        db.session.commit()

    def reject(self):
        self.status = "rejected"
        db.session.commit()
