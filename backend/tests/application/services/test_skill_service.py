from application.extensions import db
from application.models.user import User
from application.models.project import Project
from application.models.challenge_log import ChallengeLog
from application.services.skill_service import evaluate_user_skills

def test_evaluate_user_skills_no_skills(client, init_db):
    user = User(username="test_user", is_approved=True)
    user.set_password("pass123")
    db.session.add(user)
    db.session.commit()

    skills = evaluate_user_skills(user)
    assert skills is None

def test_evaluate_user_skills_with_projects_and_challenges(client, init_db):
    user = User(username="test_user", is_approved=True)
    user.set_password("pass123")
    db.session.add(user)
    db.session.commit()

    p1 = Project(name="CS1 Capstone Project", user_id=user.id, github_link="https://github.com/test")
    p2 = Project(name="Dangerous Skies Project", user_id=user.id)
    db.session.add_all([p1, p2])
    db.session.commit()

    # Let's add 12 python logs to hit Lvl 1 (Bronze)
    for i in range(12):
        cl = ChallengeLog(user_id=user.id, domain="python", challenge_slug=f"py-{i}")
        db.session.add(cl)
    db.session.commit()

    # Evaluate
    skills = evaluate_user_skills(user)
    assert skills is not None
    assert "Python (Lvl 1)" in skills
    assert "Git & GitHub (Lvl 1)" in skills
    assert "Turtle Graphics (Lvl 1)" in skills
    assert "Physics (Lvl 1)" in skills

    # Try upgrading Python to Level 2 (Silver) by adding 40 more challenges (total 52)
    for i in range(40):
        cl = ChallengeLog(user_id=user.id, domain="python", challenge_slug=f"py-more-{i}")
        db.session.add(cl)
    db.session.commit()

    skills = evaluate_user_skills(user)
    assert skills is not None
    assert "Python (Lvl 2)" in skills
