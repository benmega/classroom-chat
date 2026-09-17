"""
File: level_game_service.py
Type: py
Summary: Service functions for parsing assigned lessons, ingesting CSV level games,
         and calculating unlocked sandbox games for students.
"""

import csv
import io
import re
from collections import OrderedDict
from urllib.parse import urlparse


def parse_assigned_lesson(assigned_lesson_str):
    """
    Extracts chapter (int), lesson (int), challenge_level (str, e.g. 'a').
    Format examples: '5.1a', 'Lesson 5.1a', '5.1', '1.2b', '5.10c'.
    Computes progression_order = chapter * 10000 + lesson * 100 + (ord(challenge_level.lower()[0]) - 96 if challenge_level else 0).
    Handles fallbacks gracefully.
    """
    if not assigned_lesson_str:
        return {
            "chapter": None,
            "lesson": None,
            "challenge_level": None,
            "progression_order": 0,
        }

    raw = str(assigned_lesson_str).strip()

    # Match primary pattern: optional prefix (e.g. "Lesson "), digits, dot, digits, optional letter(s)
    m = re.search(r'(?:lesson\s*)?(\d+)\.(\d+)\s*([a-zA-Z]+)?', raw, re.IGNORECASE)
    if m:
        chapter = int(m.group(1))
        lesson = int(m.group(2))
        challenge_level = m.group(3).lower() if m.group(3) else None
    else:
        # Fallback 1: separated by hyphen or space, e.g. "5-1a" or "5 1a"
        m = re.search(r'(\d+)[-_\s]+(\d+)\s*([a-zA-Z]+)?', raw, re.IGNORECASE)
        if m:
            chapter = int(m.group(1))
            lesson = int(m.group(2))
            challenge_level = m.group(3).lower() if m.group(3) else None
        else:
            # Fallback 2: single number, e.g. "5" or "5a"
            m = re.search(r'(\d+)\s*([a-zA-Z]+)?', raw, re.IGNORECASE)
            if m:
                chapter = int(m.group(1))
                lesson = 1
                challenge_level = m.group(2).lower() if m.group(2) else None
            else:
                return {
                    "chapter": None,
                    "lesson": None,
                    "challenge_level": None,
                    "progression_order": 0,
                }

    sub_score = 0
    if challenge_level:
        first_char = challenge_level[0].lower()
        if 'a' <= first_char <= 'z':
            sub_score = ord(first_char) - 96

    progression_order = (chapter or 0) * 10000 + (lesson or 0) * 100 + sub_score
    return {
        "chapter": chapter,
        "lesson": lesson,
        "challenge_level": challenge_level,
        "progression_order": progression_order,
    }


def resolve_course_id(chapter_name=None, chapter_val=None, course_val=None):
    """
    Attempts to resolve a course id matching chapter_name or chapter_val against the Course table.
    """
    from application.models.course import Course

    candidates = [
        str(c).strip()
        for c in [course_val, chapter_name, chapter_val]
        if c is not None and str(c).strip()
    ]
    if not candidates:
        return None

    all_courses = Course.query.all()
    # 1. Exact id match
    for cand in candidates:
        for c in all_courses:
            if c.id == cand:
                return c.id

    # 2. Case-insensitive name match
    for cand in candidates:
        cand_lower = cand.lower()
        for c in all_courses:
            if c.name.lower() == cand_lower:
                return c.id

    # 3. Normalized alphanumeric match
    for cand in candidates:
        cand_clean = re.sub(r'[^a-zA-Z0-9]', '', cand).lower()
        if not cand_clean:
            continue
        for c in all_courses:
            if re.sub(r'[^a-zA-Z0-9]', '', c.name).lower() == cand_clean:
                return c.id
            if re.sub(r'[^a-zA-Z0-9]', '', c.id).lower() == cand_clean:
                return c.id

    # 4. Chapter number heuristic: if candidate has a digit, check against "ChapterX", "CSX"
    for cand in candidates:
        num_match = re.search(r'\d+', cand)
        if num_match:
            num = num_match.group(0)
            for c in all_courses:
                c_clean = re.sub(r'[^a-zA-Z0-9]', '', c.name).lower()
                if c_clean in (f"chapter{num}", f"cs{num}"):
                    return c.id

    return None


def ingest_games_csv(file_content_or_stream, replace_all=True):
    """
    Reads CSV with csv.DictReader.
    Ingests user columns:
      Title, Link, Assigned Lesson, Chapter, Chapter Name, ChapterTitle, Platform, Comment,
      RequiresAccount, Rating, AI Rating, Human Rating, Verified.
    Validates URLs (must start with http:// or https://).
    Resolves course identifiers matching Chapter Name / Chapter against Course table if possible.
    Inserts or replaces LevelGame records.
    Returns summary: {"success": True, "total_rows": N, "inserted": N, "errors": []}.
    """
    from application.extensions import db
    from application.models.level_game import LevelGame

    if hasattr(file_content_or_stream, "read"):
        content = file_content_or_stream.read()
        if isinstance(content, bytes):
            content = content.decode("utf-8-sig", errors="replace")
        stream = io.StringIO(content)
    elif isinstance(file_content_or_stream, bytes):
        stream = io.StringIO(file_content_or_stream.decode("utf-8-sig", errors="replace"))
    elif isinstance(file_content_or_stream, str):
        stream = io.StringIO(file_content_or_stream)
    else:
        stream = io.StringIO(str(file_content_or_stream))

    reader = csv.DictReader(stream)
    if not reader.fieldnames:
        return {
            "success": False,
            "total_rows": 0,
            "inserted": 0,
            "errors": ["CSV file appears to be empty or has no header row."],
        }

    games_to_insert = []
    errors = []
    total_rows = 0

    for row_idx, raw_row in enumerate(reader, start=1):
        if not any(v and v.strip() for v in raw_row.values() if v):
            continue

        total_rows += 1

        # Normalize keys to lowercase stripped strings
        row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

        game_name = (
            row.get("title")
            or row.get("game name")
            or row.get("game_name")
            or row.get("name")
            or ""
        ).strip()
        if not game_name:
            errors.append(f"Row {row_idx}: Missing game title/name.")
            continue

        game_url = (
            row.get("link")
            or row.get("game url")
            or row.get("game_url")
            or row.get("url")
            or ""
        ).strip()
        parsed_url = urlparse(game_url)
        if (
            not (game_url.startswith("http://") or game_url.startswith("https://"))
            or parsed_url.scheme.lower() not in ("http", "https")
            or not parsed_url.netloc
            or any(c in game_url for c in ["<", ">", '"', "'"])
        ):
            errors.append(f"Row {row_idx}: Invalid URL '{game_url}'. Must start with http:// or https://.")
            continue

        assigned_lesson = (
            row.get("assigned lesson")
            or row.get("assigned_lesson")
            or row.get("lesson")
            or ""
        ).strip()

        chapter_str = row.get("chapter", "").strip()
        chapter_name = (
            row.get("chapter name")
            or row.get("chapter_name")
            or row.get("chaptertitle")
            or row.get("chapter_title")
            or ""
        ).strip()
        course_str = row.get("course", "").strip() or row.get("course_id", "").strip()

        if not assigned_lesson:
            lesson_num = row.get("lesson_number") or "1"
            if chapter_str:
                assigned_lesson = f"{chapter_str}.{lesson_num}"
            else:
                assigned_lesson = "1.1"

        parsed_lesson = parse_assigned_lesson(assigned_lesson)
        chapter = parsed_lesson["chapter"]
        lesson = parsed_lesson["lesson"]
        challenge_level = parsed_lesson["challenge_level"]
        progression_order = parsed_lesson["progression_order"]

        if chapter is None and chapter_str.isdigit():
            chapter = int(chapter_str)
            progression_order = chapter * 10000 + (lesson or 1) * 100 + (
                (ord(challenge_level.lower()[0]) - 96) if challenge_level else 0
            )

        course_id = resolve_course_id(
            chapter_name=chapter_name,
            chapter_val=chapter_str or chapter,
            course_val=course_str,
        )

        platform = row.get("platform") or None
        comment = row.get("comment") or row.get("notes") or row.get("note") or None

        req_acc_val = (
            row.get("requiresaccount")
            or row.get("requires account")
            or row.get("requires_account")
            or ""
        ).lower()
        requires_account = req_acc_val in ("true", "1", "yes", "y", "t")

        rating = None
        for r_key in ["rating", "human rating", "human_rating", "ai rating", "ai_rating"]:
            r_val = row.get(r_key)
            if r_val:
                try:
                    rating = float(r_val)
                    break
                except ValueError:
                    pass

        ver_val = row.get("verified", "").strip().lower()
        if ver_val == "":
            verified = True
        else:
            verified = ver_val in ("true", "1", "yes", "y", "t")

        game = LevelGame(
            course_id=course_id,
            chapter=chapter,
            lesson=lesson,
            challenge_level=challenge_level,
            assigned_lesson=assigned_lesson,
            progression_order=progression_order,
            game_name=game_name,
            game_url=game_url,
            platform=platform,
            comment=comment,
            requires_account=requires_account,
            rating=rating,
            verified=verified,
        )
        games_to_insert.append(game)

    try:
        if replace_all:
            LevelGame.query.delete()

        db.session.add_all(games_to_insert)
        db.session.commit()
        return {
            "success": True,
            "total_rows": total_rows,
            "inserted": len(games_to_insert),
            "errors": errors,
        }
    except Exception as e:
        db.session.rollback()
        return {
            "success": False,
            "total_rows": total_rows,
            "inserted": 0,
            "errors": errors + [str(e)],
        }


def get_student_sandbox_games(user, classroom):
    """
    Retrieves available sandbox games for a student in a classroom.
    - Check classroom.sandbox_active. If False, return {"sandbox_active": False, "games": [], "message": "Sandbox mode is inactive"}.
    - Get student's completed challenges/levels from ChallengeLog for active courses in this classroom.
    - Algorithm for min 3 games:
      - Sort distinct lesson milestones in the course descending by progression_order.
      - Find the student's highest completed lesson milestone (based on completed level sequence/count or direct match).
      - Select all games for the highest completed milestone.
      - If total games < 3, step back to preceding milestones and add their games until total >= 3 or no earlier milestones exist.
      - If student has 0 completed levels, fallback to earliest milestone games (e.g. 1.1a) or return intro games.
      - Return { "sandbox_active": True, "highest_milestone": ..., "games": [...] }.
    """
    if not classroom.sandbox_active:
        return {
            "sandbox_active": False,
            "games": [],
            "message": "Sandbox mode is inactive",
        }

    from application.models.challenge import Challenge
    from application.models.challenge_log import ChallengeLog
    from application.models.level_game import LevelGame

    active_course_ids = [
        ci.course_id for ci in (classroom.course_assignments or []) if ci.course_id
    ]

    base_query = LevelGame.query.filter(LevelGame.verified.is_(True))
    if active_course_ids:
        course_games = base_query.filter(
            (LevelGame.course_id.in_(active_course_ids)) | (LevelGame.course_id.is_(None))
        ).all()
        if not course_games:
            course_games = base_query.all()
    else:
        course_games = base_query.all()

    if not course_games:
        course_games = LevelGame.query.all()

    if not course_games:
        return {
            "sandbox_active": True,
            "highest_milestone": None,
            "games": [],
        }

    games_by_milestone = {}
    milestone_order = {}

    for g in course_games:
        m = g.assigned_lesson
        if m not in games_by_milestone:
            games_by_milestone[m] = []
            milestone_order[m] = g.progression_order
        games_by_milestone[m].append(g)

    sorted_milestones_asc = sorted(
        games_by_milestone.keys(), key=lambda m: (milestone_order[m], m)
    )
    sorted_milestones_desc = sorted(
        games_by_milestone.keys(), key=lambda m: (milestone_order[m], m), reverse=True
    )

    log_query = ChallengeLog.query.filter(ChallengeLog.user_id == user.id)
    if active_course_ids:
        student_logs = log_query.filter(
            (ChallengeLog.course_id.in_(active_course_ids))
            | (ChallengeLog.course_id.is_(None))
        ).all()
        if not student_logs:
            student_logs = log_query.all()
    else:
        student_logs = log_query.all()

    completed_slugs = {
        l.challenge_slug.strip().lower() for l in student_logs if l.challenge_slug
    }
    completed_count = len(student_logs)

    challenges = []
    if completed_slugs:
        challenges = Challenge.query.filter(Challenge.slug.in_(completed_slugs)).all()

    max_sequence = 0
    if challenges:
        seqs = [c.sequence for c in challenges if c.sequence is not None]
        if seqs:
            max_sequence = max(seqs)

    highest_milestone = None

    if completed_count == 0:
        # Fallback to earliest milestone games
        highest_milestone = sorted_milestones_asc[0]
        selected_games = list(games_by_milestone[highest_milestone])

        # Advance forward if < 3 games
        curr_idx = 0
        while len(selected_games) < 3 and (curr_idx + 1) < len(sorted_milestones_asc):
            curr_idx += 1
            next_m = sorted_milestones_asc[curr_idx]
            for g in games_by_milestone[next_m]:
                if g not in selected_games:
                    selected_games.append(g)

        return {
            "sandbox_active": True,
            "highest_milestone": highest_milestone,
            "games": [g.to_dict() for g in selected_games],
        }

    # 1. Check direct match (in descending order to find highest milestone)
    for m in sorted_milestones_desc:
        m_norm = m.strip().lower()
        if m_norm in completed_slugs:
            highest_milestone = m
            break
        m_hyphen = m_norm.replace(".", "-")
        pattern = rf"(?:^|[^0-9a-zA-Z]){re.escape(m_hyphen)}(?:$|[^0-9a-zA-Z])"
        pattern_norm = rf"(?:^|[^0-9a-zA-Z]){re.escape(m_norm)}(?:$|[^0-9a-zA-Z])"
        if any(re.search(pattern, slug) or re.search(pattern_norm, slug) for slug in completed_slugs):
            highest_milestone = m
            break

    # 2. If no direct match, determine milestone by sequence or completed count
    if not highest_milestone:
        if max_sequence > 0:
            target_idx = min(max_sequence, len(sorted_milestones_asc)) - 1
        else:
            target_idx = min(completed_count, len(sorted_milestones_asc)) - 1
        target_idx = max(0, target_idx)
        highest_milestone = sorted_milestones_asc[target_idx]

    selected_games = list(games_by_milestone[highest_milestone])

    # Step back to preceding milestones until >= 3 or no earlier milestones exist
    curr_idx = sorted_milestones_asc.index(highest_milestone)
    while len(selected_games) < 3 and curr_idx > 0:
        curr_idx -= 1
        preceding_m = sorted_milestones_asc[curr_idx]
        for g in games_by_milestone[preceding_m]:
            if g not in selected_games:
                selected_games.append(g)

    return {
        "sandbox_active": True,
        "highest_milestone": highest_milestone,
        "games": [g.to_dict() for g in selected_games],
    }
