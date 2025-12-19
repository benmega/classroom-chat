from application.extensions import db

class DuckTradeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), db.ForeignKey('users.username'), nullable=False)
    nickname = db.Column(db.String(80), nullable=True)  # Assuming nickname is stored together
    digital_ducks = db.Column(db.Integer, nullable=False)
    bit_ducks = db.Column(db.JSON, nullable=False)  # Store as JSON instead of PickleType
    byte_ducks = db.Column(db.JSON, nullable=False)  # Store as JSON instead of PickleType
    status = db.Column(db.String(20), default="pending")  # pending, approved, rejected
    timestamp = db.Column(db.DateTime, nullable=False, default=db.func.now())

    def approve(self):
        self.status = "approved"
        db.session.commit()

    def reject(self):
        self.status = "rejected"
        db.session.commit()

    def get_trade_description(self):
        bit_count = len(self.bit_ducks)
        byte_count = len(self.byte_ducks)
        return f"{self.digital_ducks} Digital Ducks, {bit_count} Bit-Ducks and {byte_count} Byte-Ducks."
