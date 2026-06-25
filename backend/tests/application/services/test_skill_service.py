from application.extensions import db
from application.models.challenge_log import ChallengeLog
from application.models.project import Project
from application.models.skill import Skill
from application.services.skill_service import (
    get_challenge_counts_by_language,
    evaluate_user_skills,
    _award_skill,
    _get_icon,
)

def test_get_challenge_counts_by_language_empty(init_db, sample_user):
    counts = get_challenge_counts_by_language(sample_user)
    assert counts == {"Python": 0, "JavaScript": 0, "C++": 0, "Java": 0, "HTML/CSS": 0}

def test_get_challenge_counts_by_language_aliases(init_db, sample_user):
    # Setup challenge logs representing various domains & aliases
    domains_and_aliases = [
        ("python", "slug_py"),
        ("javascript", "slug_js"),
        ("js", "slug_js2"),
        ("cpp", "slug_cpp"),
        ("c++", "slug_cpp2"),
        ("java", "slug_java"),
        ("html", "slug_html"),
        ("html/css", "slug_htmlcss"),
        ("css", "slug_css"),
        ("web", "slug_web"),
        ("wd1", "slug_wd1"),
        ("wd2", "slug_wd2"),
        ("unsupported", "slug_unsup"), # Not mapped
        ("", "slug_empty"), # Ignored
    ]

    for domain, slug in domains_and_aliases:
        cl = ChallengeLog(user_id=sample_user.id, domain=domain, challenge_slug=slug)
        db.session.add(cl)
    db.session.commit()

    # Step 1: level completions for "wd1" / "wd2"
    # slug_wd1 and slug_wd2 contain "wd1" and "wd2"
    # This adds 2 to HTML/CSS and 2 to JavaScript
    # Step 2: aliases tallying
    # Python: "python" (1)
    # JavaScript: "javascript", "js" (2)
    # C++: "cpp", "c++" (2)
    # Java: "java" (1)
    # HTML/CSS: "html", "html/css", "css", "web", "wd1", "wd2" (6)

    counts = get_challenge_counts_by_language(sample_user)
    assert counts["Python"] == 1
    assert counts["JavaScript"] == 4 # 2 from step 1 + 2 from step 2
    assert counts["C++"] == 2
    assert counts["Java"] == 1
    assert counts["HTML/CSS"] == 8 # 2 from step 1 + 6 from step 2

def test_evaluate_user_skills_language_badges(init_db, sample_user):
    # Bronze (>= 10)
    for i in range(10):
        cl = ChallengeLog(user_id=sample_user.id, domain="python", challenge_slug=f"py_{i}")
        db.session.add(cl)
    
    # Silver (>= 50)
    for i in range(50):
        cl = ChallengeLog(user_id=sample_user.id, domain="js", challenge_slug=f"js_{i}")
        db.session.add(cl)
        
    # Gold (>= 100)
    for i in range(100):
        cl = ChallengeLog(user_id=sample_user.id, domain="cpp", challenge_slug=f"cpp_{i}")
        db.session.add(cl)

    db.session.commit()

    new_skills = evaluate_user_skills(sample_user)
    assert new_skills is not None
    assert "Python (Lvl 1)" in new_skills
    assert "JavaScript (Lvl 2)" in new_skills
    assert "C++ (Lvl 3)" in new_skills

    # Verify skills in DB
    user_skills = Skill.query.filter_by(user_id=sample_user.id).all()
    skills_dict = {s.name: s.proficiency for s in user_skills}
    assert skills_dict["Python"] == 1
    assert skills_dict["JavaScript"] == 2
    assert skills_dict["C++"] == 3

def test_evaluate_user_skills_github_and_project_specific(init_db, sample_user):
    # GitHub Skill via project github_link
    proj_git = Project(name="My Project", github_link="https://github.com/test", user_id=sample_user.id)
    db.session.add(proj_git)

    # Project specific skills via project name match
    # "CS1 Capstone" -> ["Turtle Graphics", "Drawing"]
    # "CS2 Capstone" -> ["Game Design", "Conditional Logic"]
    # "Tabula Rasa" -> ["Game Design", "Level Building"]
    # "Text-Based Adventure" -> ["Storytelling", "Input Handling"]
    # "Dangerous Skies" -> ["Physics", "Game Loop"]
    proj_cap = Project(name="My CS1 Capstone project", user_id=sample_user.id)
    db.session.add(proj_cap)

    db.session.commit()

    new_skills = evaluate_user_skills(sample_user)
    assert new_skills is not None
    assert "Git & GitHub (Lvl 1)" in new_skills
    assert "Turtle Graphics (Lvl 1)" in new_skills
    assert "Drawing (Lvl 1)" in new_skills

    # No new skills awarded if we evaluate again
    assert evaluate_user_skills(sample_user) is None

def test_award_skill_upgrades_and_cleanup(init_db, sample_user):
    # Award Python Lvl 1
    new_skills = []
    _award_skill(sample_user, "Python", "language", "fab fa-python", 1, set(), new_skills)
    db.session.commit()
    
    assert len(sample_user.skills) == 1
    assert sample_user.skills[0].proficiency == 1

    # Upgrade to Lvl 2
    _award_skill(sample_user, "Python", "language", "fab fa-python", 2, set(), new_skills)
    db.session.commit()
    
    # Old one should be deleted/replaced
    assert len(sample_user.skills) == 1
    assert sample_user.skills[0].proficiency == 2

    # Try to downgrade (should be ignored)
    _award_skill(sample_user, "Python", "language", "fab fa-python", 1, set(), new_skills)
    db.session.commit()
    assert len(sample_user.skills) == 1
    assert sample_user.skills[0].proficiency == 2

    # Upgrade to Lvl 3
    _award_skill(sample_user, "Python", "language", "fab fa-python", 3, set(), new_skills)
    db.session.commit()
    assert len(sample_user.skills) == 1
    assert sample_user.skills[0].proficiency == 3

def test_get_icon():
    assert _get_icon("Python") == "fab fa-python"
    assert _get_icon("JavaScript") == "fab fa-js"
    assert _get_icon("HTML/CSS") == "fab fa-html5"
    assert _get_icon("Java") == "fab fa-java"
    assert _get_icon("C++") == "fas fa-code"
    assert _get_icon("Git & GitHub") == "fab fa-github"
    assert _get_icon("Unknown") == "fas fa-code"
