from ..extensions import db

class StoreItem(db.Model):
    __tablename__ = "store_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    base_price = db.Column(db.Double, nullable=False) # In Packets
    
    def __repr__(self):
        return f"<StoreItem {self.name}>"
