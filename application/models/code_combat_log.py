from application import db


class CodeCombatLog(db.Model):
    __tablename__ = 'code_combat_logs'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    level_name = db.Column(db.String(255), nullable=False)
    course_id = db.Column(db.String(100), nullable=False)
    course_instance = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)

    def __repr__(self):
        return f"<CodeCombatLog(username={self.username}, level={self.level_name}, timestamp={self.timestamp})>"
