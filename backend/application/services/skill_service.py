from application.extensions import db
from application.models.skill import Skill

# Project Specific Skill Map
DEFAULT_PROJECT_SKILLS = {
    "CS1 Capstone": ["Turtle Graphics", "Drawing"],
    "CS2 Capstone": ["Game Design", "Conditional Logic"],
    "Tabula Rasa": ["Game Design", "Level Building"],
    "Text-Based Adventure": ["Storytelling", "Input Handling"],
    "Dangerous Skies": ["Physics", "Game Loop"],
}


def get_challenge_counts_by_language(user):
    """
    Scans user's challenge logs and groups them by language/domain.
    Uses the 'domain' field on ChallengeLog directly — no join required.
    """
    counts = {"Python": 0, "JavaScript": 0, "C++": 0, "Java": 0, "HTML/CSS": 0}

    # Domain → language name aliases
    DOMAIN_ALIASES = {
        "python": "Python",
        "javascript": "JavaScript",
        "js": "JavaScript",
        "cpp": "C++",
        "c++": "C++",
        "java": "Java",
        "html": "HTML/CSS",
        "html/css": "HTML/CSS",
        "css": "HTML/CSS",
        "web": "HTML/CSS",
        "wd1": "HTML/CSS",
        "wd2": "HTML/CSS",
    }

    # 1. Check Course Progress for WD1/WD2 (Legacy/Special handling)
    for level_slug in user.get_completed_levels():
        if "wd1" in level_slug or "wd2" in level_slug:
            counts["HTML/CSS"] += 1
            counts["JavaScript"] += 1

    # 2. Tally challenge logs using the domain field directly
    for log in user.challenge_logs:
        domain = (log.domain or "").strip().lower()
        if not domain:
            continue

        # Direct match first
        if domain in counts:
            counts[domain] += 1
            continue

        # Alias match
        mapped = DOMAIN_ALIASES.get(domain)
        if mapped and mapped in counts:
            counts[mapped] += 1

    return counts


def evaluate_user_skills(user):
    """
    Checks the user against rules and awards missing skills.
    """
    new_skills_awarded = []

    existing_map = {f"{s.name}-{s.proficiency}" for s in user.skills}

    counts = get_challenge_counts_by_language(user)

    # Language Badges (Based on Challenge Counts)
    language_rules = [
        ("Python", counts["Python"]),
        ("JavaScript", counts["JavaScript"]),
        ("C++", counts["C++"]),
        ("Java", counts["Java"]),
        ("HTML/CSS", counts["HTML/CSS"]),
    ]

    for lang_name, count in language_rules:
        level = 0
        if count >= 10:
            level = 1  # Bronze: 10 Challenges
        if count >= 50:
            level = 2  # Silver: 50 Challenges
        if count >= 100:
            level = 3  # Gold: 100 Challenges

        if level > 0:
            _award_skill(
                user,
                lang_name,
                "language",
                _get_icon(lang_name),
                level,
                existing_map,
                new_skills_awarded,
            )

    # GitHub Skill (Based on Project Link)
    has_github = any(p.github_link for p in user.projects)
    if has_github:
        _award_skill(
            user,
            "Git & GitHub",
            "tool",
            "fab fa-github",
            1,
            existing_map,
            new_skills_awarded,
        )

    # Project Specific Skills (Based on Project Name)
    for project in user.projects:
        for default_name, skills_list in DEFAULT_PROJECT_SKILLS.items():
            if default_name.lower() in project.name.lower():
                for skill_name in skills_list:
                    _award_skill(
                        user,
                        skill_name,
                        "concept",
                        "fas fa-lightbulb",
                        1,
                        existing_map,
                        new_skills_awarded,
                    )

    if new_skills_awarded:
        db.session.commit()
        return new_skills_awarded

    return None


def _award_skill(user, name, category, icon, level, existing_map, awarded_list):
    """Helper to handle the add/upgrade logic safely."""
    # Check if the user already has this skill at any level
    existing_skill = next((s for s in user.skills if s.name == name), None)

    if existing_skill:
        if existing_skill.proficiency >= level:
            return  # Already have it at this level or higher
        # Otherwise, delete the old one to upgrade
        db.session.delete(existing_skill)
    elif level > 1:
        # Also clean up any lower proficiencies just in case they were multiple (though shouldn't happen)
        for s in [s for s in user.skills if s.name == name and s.proficiency < level]:
            db.session.delete(s)

    new_skill = Skill(
        name=name, user_id=user.id, category=category, icon=icon, proficiency=level
    )
    db.session.add(new_skill)
    awarded_list.append(f"{name} (Lvl {level})")


def _get_icon(lang_name):
    icons = {
        "Python": "fab fa-python",
        "JavaScript": "fab fa-js",
        "HTML/CSS": "fab fa-html5",
        "Java": "fab fa-java",
        "C++": "fas fa-code",
        "Git & GitHub": "fab fa-github",
    }
    return icons.get(lang_name, "fas fa-code")
