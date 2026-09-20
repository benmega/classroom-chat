"""
File: level_game_service.py
Type: py
Summary: Service functions for parsing assigned lessons, ingesting CSV level games,
         and calculating unlocked sandbox games for students.
"""

import contextlib
import csv
import io
import logging
import math
import random
import re
from collections import OrderedDict
from datetime import date
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

FALLBACK_GAME = {
    "id": None,
    "game_name": "Dragon Drop",
    "game_url": "https://www.roomrecess.com/games/DragonDrop/play.html",
    "platform": "Room Recess",
    "assigned_lesson": None,
    "challenge_slug": None,
    "rating": None,
    "requires_account": False,
    "verified": True,
    "comment": None,
}


def estimate_target_challenge_by_position(challenges, lesson, max_lessons_in_course=None):
    """
    Estimates the target challenge from a course's challenges ordered by sequence ASC
    based on the lesson number.
    Formula: progression_ratio = (lesson - 1) / max_lessons_in_course
    target_idx = floor(progression_ratio * total_challenges_in_course), clamped to [0, total_challenges - 1].
    """
    if not challenges or lesson is None:
        return None

    if max_lessons_in_course is None:
        lessons_seen = []
        for ch in challenges:
            for text in [getattr(ch, "name", None), getattr(ch, "slug", None)]:
                if not text:
                    continue
                parsed = parse_assigned_lesson(text)
                if parsed.get("lesson"):
                    lessons_seen.append(parsed["lesson"])
                for num_str in re.findall(r'(?:lesson|l)\s*(\d+)', text, re.IGNORECASE):
                    with contextlib.suppress(ValueError):
                        lessons_seen.append(int(num_str))
        max_lessons_in_course = max(lessons_seen) if lessons_seen else 10

    max_lessons_in_course = max(int(max_lessons_in_course), 1)
    progression_ratio = (lesson - 1) / max_lessons_in_course
    total_challenges = len(challenges)
    target_idx = math.floor(progression_ratio * total_challenges)
    target_idx = max(0, min(int(target_idx), total_challenges - 1))
    return challenges[target_idx]


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
      RequiresAccount, Rating, AI Rating, Human Rating, Verified, Challenge Slug.
    Validates URLs (must start with http:// or https://).
    Resolves course identifiers matching Chapter Name / Chapter against Course table if possible.
    Resolves challenge slug via priority cascade:
      Step 1: Explicit Challenge Slug (must exist in Challenge table; otherwise log warning & fallback)
      Step 2: Lesson Number Position Estimate (ratio based on highest lesson in course's challenges)
      Step 3: First Challenge of Course (ordered by sequence ASC)
      Step 4: Discard if course_id is None
    Inserts or replaces LevelGame records.
    Returns summary: {"success": True, "total_rows": N, "inserted": N, "errors": []}.
    """
    from application.extensions import db
    from application.models.challenge import Challenge
    from application.models.level_game import LevelGame

    raw = file_content_or_stream.read() if hasattr(file_content_or_stream, "read") else file_content_or_stream

    if isinstance(raw, bytes):
        if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
            content = raw.decode("utf-16", errors="replace")
        else:
            content = raw.decode("utf-8-sig", errors="replace")
    elif isinstance(raw, str):
        content = raw
    else:
        content = str(raw)

    # Normalize line endings:
    # Windows text mode or HTTP multipart can produce \r\r\n.
    # Classic Mac or certain spreadsheet exports produce bare \r.
    # Standardizing to \n avoids _csv.Error: new-line character seen in unquoted field.
    content = content.replace("\r\r\n", "\n").replace("\r\n", "\n").replace("\r", "\n")
    # Strip null characters which can corrupt csv parsing
    content = content.replace("\x00", "")

    stream = io.StringIO(content, newline="")
    reader = csv.DictReader(stream)
    try:
        if not reader.fieldnames:
            return {
                "success": False,
                "total_rows": 0,
                "inserted": 0,
                "errors": ["CSV file appears to be empty or has no header row."],
            }
    except csv.Error as e:
        return {
            "success": False,
            "total_rows": 0,
            "inserted": 0,
            "errors": [f"CSV formatting error in header: {e!s}"],
        }

    games_to_insert = []
    errors = []
    total_rows = 0

    course_challenges_cache = {}

    def get_course_challenges(cid):
        if not cid:
            return []
        if cid not in course_challenges_cache:
            course_challenges_cache[cid] = (
                Challenge.query.filter_by(course_id=cid)
                .order_by(Challenge.sequence.asc().nulls_last(), Challenge.id.asc())
                .all()
            )
        return course_challenges_cache[cid]

    row_idx = 0
    while True:
        try:
            raw_row = next(reader)
            row_idx += 1
        except StopIteration:
            break
        except csv.Error as e:
            row_idx += 1
            errors.append(f"Row {row_idx}: Failed to parse CSV row ({e!s}).")
            continue

        if not raw_row or not any(v and v.strip() for v in raw_row.values() if v):
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
            assigned_lesson = f"{chapter_str}.{lesson_num}" if chapter_str else "1.1"

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

        # Priority Cascade for Challenge Resolution:
        # Step 1 — Explicit Challenge Slug
        raw_slug = (
            row.get("challenge slug")
            or row.get("challenge_slug")
            or row.get("challenge")
            or ""
        ).strip()
        resolved_slug = None

        if raw_slug:
            matched_challenge = Challenge.query.filter_by(slug=raw_slug).first()
            if matched_challenge:
                resolved_slug = matched_challenge.slug
                if not course_id and matched_challenge.course_id:
                    course_id = matched_challenge.course_id
            else:
                logger.warning(
                    f"Row {row_idx}: Challenge slug '{raw_slug}' does not exist in database. Falling through to position estimate."
                )

        # Step 2 — Lesson Number Position Estimate (Intermediate)
        if resolved_slug is None and course_id is not None and lesson is not None:
            challenges = get_course_challenges(course_id)
            if challenges:
                estimated_challenge = estimate_target_challenge_by_position(challenges, lesson)
                if estimated_challenge:
                    resolved_slug = estimated_challenge.slug
                    logger.debug(
                        f"Row {row_idx}: Estimated challenge '{resolved_slug}' for lesson {lesson} in course '{course_id}'."
                    )

        # Step 3 — First Challenge of Course (Fallback)
        if resolved_slug is None and course_id is not None:
            challenges = get_course_challenges(course_id)
            if challenges:
                resolved_slug = challenges[0].slug
                logger.debug(
                    f"Row {row_idx}: Fallback to first challenge '{resolved_slug}' for course '{course_id}'."
                )

        # Step 4 — Discard (No Course)
        if course_id is None:
            logger.info(f"Row {row_idx}: Skipped game '{game_name}' - no associated course resolved.")
            continue

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
        verified = True if ver_val == "" else ver_val in ("true", "1", "yes", "y", "t")

        game = LevelGame(
            course_id=course_id,
            chapter=chapter,
            lesson=lesson,
            challenge_level=challenge_level,
            assigned_lesson=assigned_lesson,
            challenge_slug=resolved_slug,
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
            "errors": [*errors, str(e)],
        }


def get_student_sandbox_games(user, classroom):
    """
    Retrieves available sandbox games for a student in a classroom based on course progress.
    3a: Guard clauses (sandbox_active, active courses).
    3b: Highest completed challenge sequence per active course.
    3c: Eligible games (verified, active course, bound challenge sequence <= milestone sequence).
        If 0 completions across all active courses, returns single fallback game (Dragon Drop).
        If 0 eligible games exist with completions > 0, returns empty list with informational message.
    3d: Exactly 3 games via daily-seeded weighted random sampling (without replacement).
        If fewer than 3 eligible games exist, returns all of them.
    3e: Return shape: {"sandbox_active": True, "games": [game.to_dict(), ...], "message": ...}
    """
    # 3a — Guard Clauses
    if not classroom.sandbox_active:
        return {
            "sandbox_active": False,
            "games": [],
            "message": "Sandbox mode is inactive",
        }

    from application.extensions import db
    from application.models.challenge import Challenge
    from application.models.challenge_log import ChallengeLog
    from application.models.level_game import LevelGame

    active_course_ids = [
        ci.course_id for ci in (classroom.course_assignments or []) if ci.course_id
    ]
    if not active_course_ids:
        return {
            "sandbox_active": True,
            "games": [],
            "message": "No courses assigned to this classroom.",
        }

    # 3b — Get Student's Highest Completed Challenge Sequence Per Course
    completed_rows = (
        db.session.query(
            Challenge.slug,
            Challenge.sequence,
            Challenge.course_id.label("challenge_course_id"),
            ChallengeLog.course_id.label("log_course_id"),
        )
        .join(ChallengeLog, ChallengeLog.challenge_slug == Challenge.slug)
        .filter(
            ChallengeLog.user_id == user.id,
            (
                (Challenge.course_id.in_(active_course_ids))
                | (ChallengeLog.course_id.in_(active_course_ids))
            ),
        )
        .all()
    )

    milestone_sequence_by_course = {cid: 0 for cid in active_course_ids}
    total_completions = 0

    for row in completed_rows:
        cid = (
            row.challenge_course_id
            if (row.challenge_course_id in milestone_sequence_by_course)
            else row.log_course_id
        )
        if cid in milestone_sequence_by_course:
            total_completions += 1
            seq = row.sequence or 0
            if seq > milestone_sequence_by_course[cid]:
                milestone_sequence_by_course[cid] = seq

    # Zero completions in ALL active courses: return fallback game Dragon Drop
    if total_completions == 0:
        return {
            "sandbox_active": True,
            "games": [FALLBACK_GAME],
            "message": "Complete your first challenge to unlock more games!",
            "highest_milestone": None,
        }

    # 3c — Select Eligible Games
    eligible_candidates = (
        db.session.query(LevelGame, Challenge.sequence)
        .join(Challenge, LevelGame.challenge_slug == Challenge.slug)
        .filter(
            LevelGame.verified.is_(True),
            LevelGame.course_id.in_(active_course_ids),
        )
        .all()
    )

    eligible_games = []
    seen_ids = set()
    for game, ch_seq in eligible_candidates:
        if ch_seq is not None:
            course_milestone = milestone_sequence_by_course.get(game.course_id, 0)
            if ch_seq <= course_milestone:
                game_key = game.id if game.id is not None else (game.game_name, game.game_url)
                if game_key not in seen_ids:
                    seen_ids.add(game_key)
                    eligible_games.append(game)

    # If 0 eligible games exist but student has completions
    if not eligible_games:
        return {
            "sandbox_active": True,
            "games": [],
            "message": "No games assigned to your current progress level yet.",
            "highest_milestone": None,
        }

    # Highest completed milestone label for UI banner
    highest_milestone = None
    max_seq = max(milestone_sequence_by_course.values(), default=0)
    if max_seq > 0:
        top_ch = (
            Challenge.query.filter(
                Challenge.sequence == max_seq,
                Challenge.course_id.in_(active_course_ids),
            ).first()
        )
        if top_ch:
            highest_milestone = top_ch.name or top_ch.slug

    # 3d — Select Exactly 3 Games with Daily Seeded Weighted Random Sampling
    # Deterministic base sort: (weight DESC, id ASC)
    sorted_games = sorted(
        eligible_games,
        key=lambda g: (-(g.rating if g.rating is not None else 5.0), g.id or 0),
    )

    if len(sorted_games) <= 3:
        selected_games = sorted_games
    else:
        seed = hash(str(user.id) + str(date.today().isoformat()))
        rng = random.Random(seed)
        shuffled_games = list(sorted_games)
        rng.shuffle(shuffled_games)
        selected_games = shuffled_games[:3]

    # 3e — Return Shape
    return {
        "sandbox_active": True,
        "games": [g.to_dict() for g in selected_games],
        "message": None,
        "highest_milestone": highest_milestone,
    }
