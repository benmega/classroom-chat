# Name: user_item_purchase.py
from datetime import datetime

from application.extensions import db


class UserItemPurchase(db.Model):
    __tablename__ = "user_item_purchases"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("store_items.id"), nullable=False)
    times_purchased = db.Column(db.Integer, default=0, nullable=False)
    last_purchase = db.Column(db.DateTime, default=datetime.utcnow)

    item = db.relationship("StoreItem")