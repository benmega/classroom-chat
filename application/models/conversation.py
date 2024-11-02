from application.extensions import db

class Conversation(db.Model):
    __tablename__ = 'conversations'  # Specify the table name
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(500))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Corrected ForeignKey reference
    message_type = db.Column(db.String(20), nullable=False, default="text")  # "text", "link", "code_snippet"
    is_struck = db.Column(db.Boolean, default=False)  # Flag for struck (hidden) messages

    def __repr__(self):
        return f"<Conversation {self.user_id}: {self.message_type}>"