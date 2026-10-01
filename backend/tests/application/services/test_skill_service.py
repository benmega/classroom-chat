from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
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

    p1 = Project(
        name="CS1 Capstone Project",
        user_id=user.id,
        github_link="https://github.com/test",
    )
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
        cl = ChallengeLog(
            user_id=user.id, domain="python", challenge_slug=f"py-more-{i}"
        )
        db.session.add(cl)
    db.session.commit()

    skills = evaluate_user_skills(user)
    assert skills is not None
    assert "Python (Lvl 2)" in skills


def _make_user(username="test_user"):
    user = User(username=username, is_approved=True)
    user.set_password("pass123")
    db.session.add(user)
    db.session.commit()
    return user


def _add_python_logs(user, count, prefix):
    for i in range(count):
        db.session.add(
            ChallengeLog(user_id=user.id, domain="python", challenge_slug=f"{prefix}-{i}")
        )
    db.session.commit()


def test_evaluate_user_skills_silver_to_gold_upgrade(client, init_db):
    user = _make_user()
    _add_python_logs(user, 52, "py")

    assert evaluate_user_skills(user) == ["Python (Lvl 2)"]

    # 100 challenges total -> Gold, upgraded in place without an IntegrityError
    _add_python_logs(user, 48, "py-more")
    assert evaluate_user_skills(user) == ["Python (Lvl 3)"]

    rows = Skill.query.filter_by(user_id=user.id, name="Python").all()
    assert len(rows) == 1
    assert rows[0].proficiency == 3


def test_evaluate_user_skills_repeat_call_is_noop(client, init_db):
    user = _make_user()
    _add_python_logs(user, 12, "py")

    assert evaluate_user_skills(user) == ["Python (Lvl 1)"]
    assert evaluate_user_skills(user) is None
    assert Skill.query.filter_by(user_id=user.id, name="Python").count() == 1


def test_evaluate_user_skills_shared_project_skill_is_awarded_once(client, init_db):
    """'CS2 Capstone' and 'Tabula Rasa' both grant 'Game Design'."""
    user = _make_user()
    db.session.add_all(
        [
            Project(name="CS2 Capstone", user_id=user.id),
            Project(name="Tabula Rasa", user_id=user.id),
        ]
    )
    db.session.commit()

    awarded = evaluate_user_skills(user)

    assert awarded is not None
    assert awarded.count("Game Design (Lvl 1)") == 1
    assert "Conditional Logic (Lvl 1)" in awarded
    assert "Level Building (Lvl 1)" in awarded
    assert Skill.query.filter_by(user_id=user.id, name="Game Design").count() == 1
    assert evaluate_user_skills(user) is None


def test_evaluate_user_skills_duplicate_project_names_award_once(client, init_db):
    """A resubmitted project (two rows with the same name) must not double-award."""
    user = _make_user()
    db.session.add_all(
        [
            Project(name="CS1 Capstone", user_id=user.id),
            Project(name="CS1 Capstone", user_id=user.id),
        ]
    )
    db.session.commit()

    awarded = evaluate_user_skills(user)

    assert sorted(awarded) == ["Drawing (Lvl 1)", "Turtle Graphics (Lvl 1)"]
    assert Skill.query.filter_by(user_id=user.id).count() == 2
