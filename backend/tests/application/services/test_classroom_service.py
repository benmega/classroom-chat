from application.services.classroom_service import get_enrolled_classroom_ids, user_enrolled_in
from application.extensions import db
from application.models.classroom import user_classrooms

def test_get_enrolled_classroom_ids_empty(app):
    with app.app_context():
        assert get_enrolled_classroom_ids(1) == set()

def test_get_enrolled_classroom_ids_with_data(app):
    with app.app_context():
        db.session.execute(user_classrooms.insert().values(user_id=1, classroom_id="class_a"))
        db.session.execute(user_classrooms.insert().values(user_id=1, classroom_id="class_b"))
        db.session.execute(user_classrooms.insert().values(user_id=2, classroom_id="class_c"))
        db.session.commit()
        
        assert get_enrolled_classroom_ids(1) == {"class_a", "class_b"}
        assert get_enrolled_classroom_ids(2) == {"class_c"}

def test_user_enrolled_in(app):
    with app.app_context():
        db.session.execute(user_classrooms.insert().values(user_id=3, classroom_id="class_d"))
        db.session.commit()
        
        assert user_enrolled_in(3, "class_d") is True
        assert user_enrolled_in(3, "class_e") is False
        assert user_enrolled_in(4, "class_d") is False
