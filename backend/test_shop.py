import os
import sys

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from application import create_app
from application.extensions import db
from application.models.user import User
from application.models.store_item import StoreItem

app = create_app()

with app.app_context():
    print("Testing models and shop items logic...")

    # 1. Test StoreItems exist
    items = StoreItem.query.all()
    item_names = [item.name for item in items]
    print(f"Store items found: {len(items)}")
    for name in ["Chat Font Color", "Animated Profile Border", "Custom Profile Wallpaper", "Auto Bitshift", "Auto Challenge Claimer", "Permanent Double Duck"]:
        if name in item_names:
            print(f"[OK] {name} is present in StoreItem.")
        else:
            print(f"[FAIL] {name} is MISSING from StoreItem.")
    
    # 2. Test User flags default to false
    test_user = User.query.filter_by(username="shop_test_user").first()
    if not test_user:
        test_user = User(username="shop_test_user", nickname="Shop Test", password_hash="test", role="student", packets=10.0, duck_balance=0.0)
        db.session.add(test_user)
        db.session.commit()
    
    print(f"Initial Chat Font Color: {test_user.has_chat_font}")
    print(f"Initial Animated Border: {test_user.has_animated_border}")
    
    # 3. Test Permanent Double Duck logic
    # Set to false, award ducks
    test_user.has_double_duck = False
    test_user.last_daily_duck = None
    db.session.commit()
    test_user.award_daily_duck(10)
    db.session.commit()
    print(f"Ducks after normal daily duck (expected 10): {test_user.duck_balance}")
    
    # Set to true, award ducks
    test_user.has_double_duck = True
    test_user.last_daily_duck = None
    db.session.commit()
    test_user.award_daily_duck(10)
    db.session.commit()
    print(f"Ducks after double daily duck (expected 10 + 20 = 30): {test_user.duck_balance}")

    db.session.delete(test_user)
    db.session.commit()
    print("Done testing.")
