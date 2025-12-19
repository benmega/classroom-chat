"""
File: skill_service.py
Summary: Logic to automatically unlock skills based on user progress.
"""

from application.extensions import db
from application.models.course_instance import CourseInstance
from application.models.skill import Skill

# --- PROJECT SPECIFIC SKILL MAP ---
DEFAULT_PROJECT_SKILLS = {
    "CS1 Capstone": ["Turtle Graphics", "Drawing"],
    "CS2 Capstone": ["Game Design", "Conditional Logic"],
    "Tabula Rasa": ["Game Design", "Level Building"],
    "Text-Based Adventure": ["Storytelling", "Input Handling"],
    "Dangerous Skies": ["Physics", "Game Loop"],
}


def get_challenge_counts_by_language(user):
    """
    Scans user's challenge logs and groups them by language.
    Uses CourseInstance to determine the language for each log.
    """
    counts = {"Python": 0, "JavaScript": 0, "C++": 0, "Java": 0, "HTML/CSS": 0}

    # 1. Check Course Progress for WD1/WD2 (Legacy/Special handling)
    for level_slug in user.get_completed_levels():
        if "wd1" in level_slug or "wd2" in level_slug:
            counts["HTML/CSS"] += 1
            counts["JavaScript"] += 1

    # 2. Map Challenge Logs to Languages via CourseInstance
    # Get all logs for the user
    logs = user.challenge_logs

    # Extract unique Course Instance IDs from logs to minimize DB queries
    instance_ids = {log.course_instance for log in logs if log.course_instance}

    # Fetch all relevant CourseInstance records in one query
    instances = CourseInstance.query.filter(CourseInstance.id.in_(instance_ids)).all()

    # Create a lookup map: { instance_id: language_name }
    instance_lang_map = {inst.id: inst.language for inst in instances}

    # Iterate logs and tally counts
    for log in logs:
        # Skip if no instance ID or instance not found in DB
        if not log.course_instance or log.course_instance not in instance_lang_map:
            continue

        lang = instance_lang_map[log.course_instance]

        # Normalize or direct match the language to our counts keys
        if lang in counts:
            counts[lang] += 1

        # Handle potential aliases if necessary (example)
        elif lang == "JS":
            counts["JavaScript"] += 1
        elif lang == "Cpp":
            counts["C++"] += 1

    return counts


def evaluate_user_skills(user):
    """
    Checks the user against rules and awards missing skills.
    """
    new_skills_awarded = []

    # Get current skills map "Name-Proficiency"
    existing_map = {f"{s.name}-{s.proficiency}" for s in user.skills}

    # Pre-calculate counts
    counts = get_challenge_counts_by_language(user)

    # --- 1. LANGUAGE BADGES (Based on Challenge Counts) ---
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

    # --- 2. GITHUB SKILL (Based on Project Link) ---
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

    # --- 3. PROJECT SPECIFIC SKILLS (Based on Project Name) ---
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

    # --- 4. COMMIT ---
    if new_skills_awarded:
        db.session.commit()
        return new_skills_awarded

    return None


def _award_skill(user, name, category, icon, level, existing_map, awarded_list):
    """Helper to handle the add/upgrade logic safely."""
    rule_key = f"{name}-{level}"

    if rule_key in existing_map:
        return

    if level > 1:
        lower_skills = [
            s for s in user.skills if s.name == name and s.proficiency < level
        ]
        for ls in lower_skills:
            db.session.delete(ls)

    new_skill = Skill(
        name=name, user_id=user.id, category=category, icon=icon, proficiency=level
    )
    db.session.add(new_skill)
    existing_map.add(rule_key)
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
