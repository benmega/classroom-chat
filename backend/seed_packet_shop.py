from application import create_app
from application.extensions import db
from application.models.store_item import StoreItem

def seed_store():
    app = create_app()
    with app.app_context():
        # Clear existing items
        db.session.query(StoreItem).delete()
        
        items = [
            StoreItem(
                name="Chat Font Color",
                description="Unlock the ability to change text color in chat.",
                base_price=0.005,
                is_crowdfunded=False
            ),
            StoreItem(
                name="Auto Challenge Claimer",
                description="A bookmarklet that automatically claims completed challenges for you.",
                base_price=0.002,
                is_crowdfunded=False
            ),
            StoreItem(
                name="Animated Profile Border",
                description="A sleek, CSS-animated border around your profile avatar.",
                base_price=0.01,
                is_crowdfunded=False
            ),
            StoreItem(
                name="Auto Bitshift",
                description="Simplifies Bit Shift by auto-calculating the binary for you.",
                base_price=0.005,
                is_crowdfunded=False
            ),
            StoreItem(
                name="Custom Profile Wallpaper",
                description="Unlock the ability to set a custom profile background wallpaper.",
                base_price=0.005,
                is_crowdfunded=False
            ),
            StoreItem(
                name="Double Duck Day",
                description="When this goal is reached, the entire class gets a double duck multiplier for a whole day!",
                base_price=0.5,
                is_crowdfunded=True,
                crowdfund_goal=0.5
            ),
            StoreItem(
                name="Free Time / Game Day",
                description="When this goal is reached, the entire class gets a massive reward! (Limit once per class)",
                base_price=1,
                is_crowdfunded=True,
                crowdfund_goal=1
            )
        ]
        
        for item in items:
            db.session.add(item)
            
        db.session.commit()
        print("Packet shop seeded successfully!")

if __name__ == '__main__':
    seed_store()
