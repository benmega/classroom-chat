from ..extensions import db

class UserItemPurchase(db.Model):
    __tablename__ = "user_item_purchases"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('store_items.id', ondelete='CASCADE'), nullable=False)
    
    times_purchased = db.Column(db.Integer, nullable=False, default=0)

    user = db.relationship("User", backref=db.backref("item_purchases", cascade="all, delete-orphan", lazy="dynamic"))
    item = db.relationship("StoreItem", backref=db.backref("purchases", cascade="all, delete-orphan", lazy="dynamic"))

    # Constraint to ensure one record per user per item
    __table_args__ = (
        db.UniqueConstraint('user_id', 'item_id', name='uq_user_item'),
    )

    def __repr__(self):
        return f"<UserItemPurchase User:{self.user_id} Item:{self.item_id}>"
