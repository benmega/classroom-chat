import csv
import os
import re

import click
from flask.cli import with_appcontext


def generate_kebab_slug(text):
    """Generate a clean kebab-case slug."""
    if not text:
        return ""
    text = text.replace(" - Locked", "")
    text = text.replace(" - In Progress", "")
    slug = re.sub(r"[_\s]+", "-", text.lower())
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


@click.command("seed")
@with_appcontext
def seed_command():
    """Seed the database from the CSV files in backend/instance/migration: courses,
    achievements, course instances and challenges."""
    from application.extensions import db
    from application.models.challenge import Challenge
    from application.models.classroom import Classroom
    from application.models.course import Course
    from application.models.course_instance import CourseInstance
    from flask import current_app
    from sqlalchemy.exc import IntegrityError

    base_dir = os.path.join(
        current_app.config["BASE_DIR"], "backend", "instance", "migration"
    )
    challenges_csv = os.path.join(base_dir, "level_seed_data.csv")
    instances_csv = os.path.join(base_dir, "course_instances_seed.csv")

    # Courses come first: the course instances below are checked against them.
    for label, filename, seed_rows in (
        ("courses", "courses_seed.csv", seed_courses),
        ("achievements", "achievements_seed.csv", seed_achievements),
    ):
        definitions_csv = os.path.join(base_dir, filename)
        if not os.path.exists(definitions_csv):
            click.echo(f"File not found: {definitions_csv}")
            continue
        click.echo(f"Seeding {label} from {definitions_csv}...")
        try:
            inserted = seed_rows(definitions_csv)
            db.session.commit()
            click.echo(
                f"Successfully inserted {inserted} new {label}"
                " (existing ones are left as they are)."
            )
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error seeding {label}: {e}")

    if os.path.exists(instances_csv):
        click.echo(f"Seeding course instances from {instances_csv}...")
        inserted_instances = 0
        skipped_orphans = 0
        try:
            # SQLite foreign keys are not enforced, so an instance pointing at a
            # missing classroom or course would insert silently. Check them here.
            existing_classrooms = {cid for (cid,) in db.session.query(Classroom.id)}
            existing_courses = {cid for (cid,) in db.session.query(Course.id)}
            with open(instances_csv, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    instance_id = row.get("id")
                    if not instance_id:
                        continue

                    exists = CourseInstance.query.filter_by(id=instance_id).first()
                    if not exists:
                        classroom_id = (row.get("classroom_id") or "").strip()
                        course_id = (row.get("course_id") or "").strip() or None
                        missing = []
                        if classroom_id not in existing_classrooms:
                            missing.append(f"classroom '{classroom_id}'")
                        if course_id is not None and course_id not in existing_courses:
                            missing.append(f"course '{course_id}'")
                        if missing:
                            click.echo(
                                f"Skipping orphan course instance {instance_id}: "
                                f"unknown {' and '.join(missing)}."
                            )
                            skipped_orphans += 1
                            continue

                        new_instance = CourseInstance(
                            id=instance_id,
                            classroom_id=classroom_id,
                            course_id=course_id,
                        )
                        db.session.add(new_instance)
                        inserted_instances += 1

            db.session.commit()
            click.echo(
                f"Successfully inserted {inserted_instances} new course instances"
                f" (skipped {skipped_orphans} orphan rows)."
            )
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error seeding course instances: {e}")
    else:
        click.echo(f"File not found: {instances_csv}")

    if os.path.exists(challenges_csv):
        click.echo(f"Seeding challenges from {challenges_csv}...")
        inserted_challenges = 0
        updated_challenges = 0
        skipped_challenges = 0
        try:
            with open(challenges_csv, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get("name", "").strip()
                    if name.endswith(" - In Progress"):
                        name = name[:-14]
                    domain = row.get("domain", "").strip()
                    if not name or not domain:
                        continue

                    csv_slug = row.get("slug", "").strip() or generate_kebab_slug(name)
                    difficulty = row.get("difficulty", "medium").capitalize()
                    value = float(row.get("value") or 1)
                    description = row.get("description", "No description provided.")
                    course_id = row.get("course_id")

                    # The slug alone identifies a challenge: levels may share a
                    # name, even inside one domain. Each row gets a savepoint, so
                    # a row the database rejects (a schema that still enforces
                    # unique names) is skipped instead of failing the whole file.
                    try:
                        with db.session.begin_nested():
                            challenge = Challenge.query.filter_by(slug=csv_slug).first()
                            if challenge:
                                challenge.name = name
                                challenge.domain = domain
                                challenge.difficulty = difficulty
                                challenge.value = value
                                challenge.description = description
                                challenge.course_id = course_id
                            else:
                                db.session.add(
                                    Challenge(
                                        name=name,
                                        slug=csv_slug,
                                        domain=domain,
                                        course_id=course_id,
                                        description=description,
                                        difficulty=difficulty,
                                        value=value,
                                        is_active=True,
                                    )
                                )
                    except IntegrityError as e:
                        click.echo(f"Skipping challenge '{csv_slug}': {e.orig}")
                        skipped_challenges += 1
                        continue

                    if challenge:
                        updated_challenges += 1
                    else:
                        inserted_challenges += 1

            db.session.commit()
            summary = (
                f"Successfully inserted {inserted_challenges} and updated {updated_challenges} challenges."
            )
            if skipped_challenges:
                summary += (
                    f" Skipped {skipped_challenges} rows the database rejected:"
                    " its schema is older than the models. Update it and seed"
                    " again: `flask db upgrade`, or for a development database"
                    " that create_all built, delete it or stamp it and then"
                    " upgrade (docs/infrastructure_and_devops.md, section 8)."
                )
            click.echo(summary)
        except Exception as e:
            db.session.rollback()
            click.echo(f"Error seeding challenges: {e}")
    else:
        click.echo(f"File not found: {challenges_csv}")

    from application.commands.projects_data import PROJECT_SEED_DATA
    from application.models.project_template import ProjectTemplate

    click.echo("Seeding standard project templates...")
    inserted_projects = 0
    updated_projects = 0
    try:
        for name, desc, chapter in PROJECT_SEED_DATA:
            pt = ProjectTemplate.query.filter_by(name=name).first()
            if not pt:
                pt = ProjectTemplate(name=name, description=desc, chapter=chapter)
                db.session.add(pt)
                inserted_projects += 1
            else:
                pt.chapter = chapter
                pt.description = desc
                updated_projects += 1

        db.session.commit()
        click.echo(
            f"Successfully inserted {inserted_projects} and updated {updated_projects} project templates."
        )
    except Exception as e:
        db.session.rollback()
        click.echo(f"Error seeding project templates: {e}")

    click.echo("Seeding 3D modeling track...")
    try:
        stats = seed_three_d_track()
        click.echo(
            "3D modeling track: "
            f"courses +{stats['courses_inserted']}/~{stats['courses_updated']}, "
            f"challenges +{stats['challenges_inserted']}/~{stats['challenges_updated']}, "
            f"templates +{stats['templates_inserted']}/~{stats['templates_updated']}."
        )
    except Exception as e:
        db.session.rollback()
        click.echo(f"Error seeding 3D modeling track: {e}")


def seed_courses(csv_path):
    """Add the courses in ``csv_path`` that the database does not have yet.

    Insert-only, keyed on the course id: a course that already exists is never
    changed, so what an admin edited stays as it is. Does not commit; returns the
    number of courses added.
    """
    from application.extensions import db
    from application.models.course import Course

    known_ids = {course_id for (course_id,) in db.session.query(Course.id)}
    inserted = 0
    with open(csv_path, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            course_id = (row.get("id") or "").strip()
            if not course_id or course_id in known_ids:
                continue

            course = Course(id=course_id, name=row["name"], domain=row["domain"])
            # A blank cell leaves the column to the model's default
            if row.get("description"):
                course.description = row["description"]
            if row.get("default_challenge_value"):
                default_value = float(row["default_challenge_value"])
                course.default_challenge_value = (
                    int(default_value) if default_value.is_integer() else default_value
                )
            db.session.add(course)
            known_ids.add(course_id)
            inserted += 1
    return inserted


def seed_achievements(csv_path):
    """Add the achievements in ``csv_path`` that the database does not have yet.

    Insert-only, keyed on the slug: an achievement that already exists is never
    changed, so a name, reward or requirement edited by an admin stays as it is.
    Does not commit; returns the number of achievements added.
    """
    from application.extensions import db
    from application.models.achievements import Achievement

    known_slugs = {slug for (slug,) in db.session.query(Achievement.slug)}
    inserted = 0
    with open(csv_path, mode="r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            slug = (row.get("slug") or "").strip()
            if not slug or slug in known_slugs:
                continue

            db.session.add(
                Achievement(
                    slug=slug,
                    name=row["name"],
                    description=row.get("description") or None,
                    type=row["type"],
                    requirement_value=row.get("requirement_value") or None,
                    reward=int(row.get("reward") or 1),
                    source=row.get("source") or None,
                )
            )
            known_slugs.add(slug)
            inserted += 1
    return inserted


def _is_blank_or_placeholder(text):
    """True for empty text or the placeholder left by the retired seed script."""
    if not text or not str(text).strip():
        return True
    return bool(re.fullmatch(r"Project for .+\.", str(text).strip()))


def _with_current_submit_goals(goals, replacements):
    """``goals`` with every goal found word for word in ``replacements`` swapped for
    its current wording. A new list: the JSON column only notices an assignment."""
    return [
        replacements.get(goal, goal) if isinstance(goal, str) else goal
        for goal in goals
    ]


def seed_three_d_track():
    """Idempotently upsert the 3D modeling courses, challenges and templates.

    Never deletes anything. Structural fields (course/domain/sequence/chapter/
    challenge link/project type) are kept in sync with the seed data;
    teacher-editable content (descriptions, goals, concepts, difficulty on
    templates) is only filled in when it is blank, so admin edits survive every
    deploy. The one exception: a submit goal the seed itself wrote before is
    replaced by its current wording while it is still there word for word.

    Commits on success; the caller handles rollback on error. Returns a dict
    of insert/update counters.
    """
    from application.commands.three_d_data import (
        SUBMIT_GOAL_REPLACEMENTS,
        THREE_D_CHALLENGES,
        THREE_D_COURSES,
        THREE_D_DOMAIN,
    )
    from application.extensions import db
    from application.models.challenge import Challenge
    from application.models.challenge_log import ChallengeLog
    from application.models.course import Course
    from application.models.project_template import ProjectTemplate

    stats = {
        "courses_inserted": 0,
        "courses_updated": 0,
        "challenges_inserted": 0,
        "challenges_updated": 0,
        "templates_inserted": 0,
        "templates_updated": 0,
    }

    course_names = {}
    for c in THREE_D_COURSES:
        course_names[c["id"]] = c["name"]
        course = db.session.get(Course, c["id"])
        if not course:
            db.session.add(
                Course(
                    id=c["id"],
                    name=c["name"],
                    domain=THREE_D_DOMAIN,
                    description=c["description"],
                )
            )
            stats["courses_inserted"] += 1
        else:
            course.name = c["name"]
            course.domain = THREE_D_DOMAIN
            if _is_blank_or_placeholder(course.description) or (
                course.description == "No description provided."
            ):
                course.description = c["description"]
            stats["courses_updated"] += 1
    db.session.flush()

    sequence_by_course = {}
    for ch in THREE_D_CHALLENGES:
        course_id = ch["course_id"]
        sequence = sequence_by_course.get(course_id, 0) + 1
        sequence_by_course[course_id] = sequence
        name = ch["name"]
        slug = generate_kebab_slug(name)

        challenge = Challenge.query.filter_by(slug=slug).first()
        if not challenge:
            # Rows created by the retired seed script used a different slug
            # scheme; adopt them by (name, domain) and migrate their slug.
            challenge = Challenge.query.filter_by(
                name=name, domain=THREE_D_DOMAIN
            ).first()
            if challenge and challenge.slug != slug:
                old_slug = challenge.slug
                challenge.slug = slug
                ChallengeLog.query.filter_by(challenge_slug=old_slug).update(
                    {"challenge_slug": slug}, synchronize_session=False
                )
                ProjectTemplate.query.filter_by(challenge_slug=old_slug).update(
                    {"challenge_slug": slug}, synchronize_session=False
                )

        if not challenge:
            db.session.add(
                Challenge(
                    name=name,
                    slug=slug,
                    domain=THREE_D_DOMAIN,
                    difficulty="medium",
                    value=1,
                    sequence=sequence,
                    course_id=course_id,
                    description=ch["description"],
                    is_active=True,
                )
            )
            stats["challenges_inserted"] += 1
        else:
            challenge.domain = THREE_D_DOMAIN
            challenge.course_id = course_id
            challenge.sequence = sequence
            if _is_blank_or_placeholder(challenge.description):
                challenge.description = ch["description"]
            stats["challenges_updated"] += 1

        template = ProjectTemplate.query.filter_by(name=name).first()
        if not template:
            db.session.add(
                ProjectTemplate(
                    name=name,
                    description=ch["description"],
                    chapter=course_names[course_id],
                    difficulty=ch["difficulty"],
                    concepts=list(ch["concepts"]),
                    goals=list(ch["goals"]),
                    challenge_slug=slug,
                    project_type=ch["project_type"],
                )
            )
            stats["templates_inserted"] += 1
        else:
            template.chapter = course_names[course_id]
            template.challenge_slug = slug
            template.project_type = ch["project_type"]
            if _is_blank_or_placeholder(template.description):
                template.description = ch["description"]
            if not template.concepts:
                template.concepts = list(ch["concepts"])
            if not template.goals:
                template.goals = list(ch["goals"])
            elif isinstance(template.goals, list):
                goals = _with_current_submit_goals(template.goals, SUBMIT_GOAL_REPLACEMENTS)
                if goals != template.goals:
                    template.goals = goals
            if not template.difficulty:
                template.difficulty = ch["difficulty"]
            stats["templates_updated"] += 1
        db.session.flush()

    db.session.commit()
    return stats
