import pytest
from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.skill import Skill
from application.models.user import User
from application.services.skill_service import (
    _award_skill,
    evaluate_user_skills,
    get_challenge_counts_by_language,
)


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


def _add_logs(user, domain, count, prefix):
    for i in range(count):
        db.session.add(
            ChallengeLog(user_id=user.id, domain=domain, challenge_slug=f"{prefix}-{i}")
        )
    db.session.commit()


def test_challenge_counts_start_at_zero_for_every_language(client, init_db):
    user = _make_user()

    assert get_challenge_counts_by_language(user) == {
        "Python": 0,
        "JavaScript": 0,
        "C++": 0,
        "Java": 0,
        "HTML/CSS": 0,
    }


def test_challenge_counts_map_domain_aliases_case_insensitively(client, init_db):
    user = _make_user()
    domains = ["python", "Python", " PYTHON ", "javascript", "js", "JS", "cpp", "c++", "C++"]
    domains += ["java", "html", "html/css", "css", "web", "wd1", "wd2"]
    for n, domain in enumerate(domains):
        _add_logs(user, domain, 1, f"domain-{n}")

    counts = get_challenge_counts_by_language(user)

    assert counts == {"Python": 3, "JavaScript": 3, "C++": 3, "Java": 1, "HTML/CSS": 6}


def test_challenge_counts_ignore_blank_and_unknown_domains(client, init_db):
    user = _make_user()
    _add_logs(user, "", 2, "blank")
    _add_logs(user, "   ", 2, "spaces")
    _add_logs(user, "codecombat.com", 3, "cc")
    _add_logs(user, "ruby", 3, "rb")

    counts = get_challenge_counts_by_language(user)

    assert sum(counts.values()) == 0


def test_challenge_counts_only_cover_the_given_user(client, init_db):
    user = _make_user()
    other = _make_user("someone_else")
    _add_logs(user, "python", 2, "mine")
    _add_logs(other, "python", 5, "theirs")

    assert get_challenge_counts_by_language(user)["Python"] == 2
    assert get_challenge_counts_by_language(other)["Python"] == 5


def test_challenge_counts_wd1_wd2_slugs_count_for_html_and_javascript(client, init_db):
    user = _make_user()
    # The slug marks a web-development level whatever the domain says
    db.session.add_all(
        [
            ChallengeLog(user_id=user.id, domain="codecombat.com", challenge_slug="wd1-intro"),
            ChallengeLog(user_id=user.id, domain="codecombat.com", challenge_slug="level-wd2-forms"),
            ChallengeLog(user_id=user.id, domain="codecombat.com", challenge_slug="gd1-other"),
        ]
    )
    db.session.commit()

    counts = get_challenge_counts_by_language(user)

    assert counts["HTML/CSS"] == 2
    assert counts["JavaScript"] == 2
    assert counts["Python"] == 0


def test_challenge_counts_wd_slug_and_html_domain_both_count(client, init_db):
    user = _make_user()
    db.session.add(ChallengeLog(user_id=user.id, domain="html", challenge_slug="wd1-page"))
    db.session.commit()

    counts = get_challenge_counts_by_language(user)

    # One log, two rules: the slug rule (HTML/CSS and JavaScript) and the html alias
    assert counts["HTML/CSS"] == 2
    assert counts["JavaScript"] == 1


def test_challenge_counts_wd_slug_repeated_across_logs_counts_once(client, init_db):
    user = _make_user()
    db.session.add_all(
        [
            ChallengeLog(user_id=user.id, domain="x", challenge_slug="wd1-intro", course_id="a"),
            ChallengeLog(user_id=user.id, domain="x", challenge_slug="wd1-intro", course_id="b"),
        ]
    )
    db.session.commit()

    counts = get_challenge_counts_by_language(user)

    assert counts["HTML/CSS"] == 1
    assert counts["JavaScript"] == 1


@pytest.mark.parametrize(
    "logs, level",
    [
        (0, None),
        (9, None),
        (10, 1),
        (49, 1),
        (50, 2),
        (99, 2),
        (100, 3),
        (250, 3),
    ],
)
def test_evaluate_user_skills_level_thresholds(client, init_db, logs, level):
    user = _make_user()
    _add_python_logs(user, logs, "py")

    awarded = evaluate_user_skills(user)

    skill = Skill.query.filter_by(user_id=user.id, name="Python").first()
    if level is None:
        assert awarded is None
        assert skill is None
    else:
        assert awarded == [f"Python (Lvl {level})"]
        assert (skill.category, skill.icon, skill.proficiency) == (
            "language",
            "fab fa-python",
            level,
        )


def test_evaluate_user_skills_awards_each_language_by_its_own_count(client, init_db):
    user = _make_user()
    _add_logs(user, "js", 10, "js")
    _add_logs(user, "cpp", 50, "cpp")
    _add_logs(user, "java", 9, "java")

    awarded = evaluate_user_skills(user)

    assert sorted(awarded) == ["C++ (Lvl 2)", "JavaScript (Lvl 1)"]
    names = {s.name for s in Skill.query.filter_by(user_id=user.id)}
    assert names == {"C++", "JavaScript"}


def test_evaluate_user_skills_github_skill_needs_a_github_link(client, init_db):
    user = _make_user()
    db.session.add(Project(name="No link", user_id=user.id))
    db.session.commit()
    assert evaluate_user_skills(user) is None

    db.session.add(Project(name="Linked", user_id=user.id, github_link="https://github.com/x/y"))
    db.session.commit()

    assert evaluate_user_skills(user) == ["Git & GitHub (Lvl 1)"]
    skill = Skill.query.filter_by(user_id=user.id, name="Git & GitHub").one()
    assert (skill.category, skill.icon, skill.proficiency) == ("tool", "fab fa-github", 1)


def test_evaluate_user_skills_does_not_lower_an_existing_proficiency(client, init_db):
    user = _make_user()
    db.session.add(
        Skill(name="Python", user_id=user.id, category="language", icon="custom", proficiency=3)
    )
    db.session.commit()
    _add_python_logs(user, 12, "py")  # only earns Lvl 1

    assert evaluate_user_skills(user) is None

    skill = Skill.query.filter_by(user_id=user.id, name="Python").one()
    assert skill.proficiency == 3
    assert skill.icon == "custom"


def test_evaluate_user_skills_upgrades_a_lower_proficiency_in_place(client, init_db):
    user = _make_user()
    db.session.add(
        Skill(name="Python", user_id=user.id, category="concept", icon="custom", proficiency=1)
    )
    db.session.commit()
    _add_python_logs(user, 50, "py")

    assert evaluate_user_skills(user) == ["Python (Lvl 2)"]

    skill = Skill.query.filter_by(user_id=user.id, name="Python").one()
    assert (skill.proficiency, skill.category, skill.icon) == (2, "language", "fab fa-python")


def test_award_skill_never_lowers_a_skill_or_reports_it(client, init_db):
    user = _make_user()
    held = Skill(name="Drawing", user_id=user.id, proficiency=2)
    db.session.add(held)
    db.session.commit()
    awarded = []
    by_name = {"Drawing": held}

    _award_skill(user, "Drawing", "concept", "fas fa-lightbulb", 1, by_name, awarded)
    _award_skill(user, "Drawing", "concept", "fas fa-lightbulb", 2, by_name, awarded)

    assert held.proficiency == 2
    assert awarded == []

    _award_skill(user, "Drawing", "concept", "fas fa-lightbulb", 3, by_name, awarded)

    assert held.proficiency == 3
    assert awarded == ["Drawing (Lvl 3)"]


def test_evaluate_user_skills_project_name_match_ignores_case(client, init_db):
    user = _make_user()
    db.session.add(Project(name="my tabula rasa remix", user_id=user.id))
    db.session.commit()

    awarded = evaluate_user_skills(user)

    assert sorted(awarded) == ["Game Design (Lvl 1)", "Level Building (Lvl 1)"]
    skill = Skill.query.filter_by(user_id=user.id, name="Level Building").one()
    assert (skill.category, skill.icon) == ("concept", "fas fa-lightbulb")


def test_evaluate_user_skills_unrelated_project_awards_nothing(client, init_db):
    user = _make_user()
    db.session.add(Project(name="Weather app", user_id=user.id))
    db.session.commit()

    assert evaluate_user_skills(user) is None
    assert Skill.query.filter_by(user_id=user.id).count() == 0
