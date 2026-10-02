import io
import os
import re
import subprocess
import sys
import zipfile
from datetime import datetime
from typing import Any

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.achievements import Achievement
from application.models.user import User
from application.models.user_certificate import UserCertificate
from application.utilities.helper_functions import allowed_file
from application.utilities.image_upload import (
    BADGE_MAX_EDGE,
    ImageUploadError,
    process_image,
    write_bytes_atomic,
)
from flask import (
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    request,
    send_file,
    send_from_directory,
    session,
    url_for,
)
from sqlalchemy.orm import contains_eager, joinedload
from werkzeug.utils import secure_filename

achievements = Blueprint("achievements", __name__)

# Updated to allow codecombat.com and ozaria.com (with optional www). Used with
# re.fullmatch, so nothing may precede the scheme or follow the URL. The ``course``
# parameter may sit anywhere in the query string and be followed by more
# parameters or a #fragment.
CERT_URL_REGEX = (
    r"https://(?:www\.)?(?:codecombat|ozaria)\.com/certificates/[\w\d]+"
    r"\?(?:[^\s#]*&)?course=([\w\d-]+)(?:[&#]\S*)?"
)


# Far longer than any real certificate link. The pattern is not linear on a long run
# of ``&course=`` pairs, so longer input is turned away without being matched.
MAX_CERT_URL_LENGTH = 2048

ALLOWED_EXTENSIONS = {"pdf"}

# The slug names the badge file on disk, so keep it to a path-safe charset.
SLUG_RE = re.compile(r"[a-z0-9-]+")
SLUG_ERROR = "Slug may only contain lowercase letters, digits and hyphens."
REWARD_ERROR = "Reward must be a whole number of at least 1."

# Badge uploads are normalised to <slug>.png, the only name every consumer looks for.
# The other extensions are what older uploads may have left behind.
BADGE_EXTENSIONS = ("png", "jpg", "jpeg", "webp")
SPRITE_REBUILD_TIMEOUT = 60  # seconds


class _BadgeError(Exception):
    """A badge change failed after the upload was accepted; the message is shown to the admin."""


class _BadgeFiles:
    """The badge file changes of one request, remembered so they can be undone."""

    def __init__(self):
        self._originals: dict[str, bytes | None] = {}

    def _remember(self, path):
        if path not in self._originals:
            try:
                with open(path, "rb") as handle:
                    self._originals[path] = handle.read()
            except FileNotFoundError:
                self._originals[path] = None

    def write(self, path, data):
        self._remember(path)
        write_bytes_atomic(path, data)

    def remove(self, path):
        if os.path.isfile(path):
            self._remember(path)
            os.remove(path)

    def move(self, source, target):
        with open(source, "rb") as handle:
            data = handle.read()
        self.write(target, data)
        self.remove(source)

    def undo(self):
        """Put every touched file back as it was: restored, or removed if it did not exist."""
        for path, data in self._originals.items():
            try:
                if data is not None:
                    write_bytes_atomic(path, data)
                elif os.path.exists(path):
                    os.remove(path)
            except OSError:
                current_app.logger.exception(f"Could not restore the badge file {path}")


def _badge_dir():
    """Folder of the badge images (current_app.static_folder / images / achievement_badges)."""
    return os.path.join(str(current_app.static_folder), "images", "achievement_badges")


def _badge_slug_is_safe(slug):
    """True when ``<slug>.<ext>`` is a plain file name, so a badge can never leave the badge folder."""
    return bool(slug) and all(os.path.basename(f"{slug}.{ext}") == f"{slug}.{ext}" for ext in BADGE_EXTENSIONS)


def _badge_path(slug, ext):
    badge_dir = os.path.abspath(_badge_dir())
    path = os.path.abspath(os.path.join(badge_dir, f"{slug}.{ext}"))
    if not _badge_slug_is_safe(slug) or os.path.commonpath([badge_dir, path]) != badge_dir:
        raise ValueError(f"Unsafe badge slug: {slug!r}")
    return path


def _prepare_badge(badge_file):
    """Validates an uploaded badge and returns it as a PNG of at most BADGE_MAX_EDGE pixels."""
    return process_image(
        badge_file,
        max_bytes=current_app.config["IMAGE_MAX_BYTES_BADGE"],
        max_edge=BADGE_MAX_EDGE,
        allowed_formats=("PNG", "JPEG", "WEBP"),
        output_format="PNG",
    )


def _rebuild_sprite():
    """Runs backend/tools/make_sprite_sheet.py, which packs every badge into the sprite sheet."""
    tools_dir = os.path.join(current_app.config["BASE_DIR"], "backend", "tools")
    script_path = os.path.join(tools_dir, "make_sprite_sheet.py")
    try:
        subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=True,
            text=True,
            timeout=SPRITE_REBUILD_TIMEOUT,
        )
    except subprocess.CalledProcessError as e:
        raise _BadgeError(f"Sprite sheet rebuild failed: {e.stderr}") from e
    except Exception as e:
        raise _BadgeError(f"Error rebuilding sprite sheet: {e}") from e


def _apply_badge_change(files, old_slug, new_slug, badge_png):
    """
    Brings the badge files in line with an add or edit, through ``files`` so it can be undone.

    ``badge_png`` is the new badge (PNG bytes) or None; ``old_slug`` is None for an add.
    Returns True when the sprite sheet has to be rebuilt.
    """
    slug_changed = bool(old_slug) and old_slug != new_slug
    # A stored slug from before slugs were restricted may not be a plain file name:
    # its files are left alone.
    old_files_usable = slug_changed and _badge_slug_is_safe(old_slug)

    if badge_png is not None:
        os.makedirs(_badge_dir(), exist_ok=True)
        files.write(_badge_path(new_slug, "png"), badge_png)
        # An earlier upload of another type would give the slug a second sprite cell and CSS rule.
        for ext in BADGE_EXTENSIONS[1:]:
            files.remove(_badge_path(new_slug, ext))
        if old_files_usable:
            for ext in BADGE_EXTENSIONS:
                files.remove(_badge_path(old_slug, ext))
        return True

    changed = False
    if old_files_usable:
        for ext in BADGE_EXTENSIONS:
            old_path = _badge_path(old_slug, ext)
            if os.path.isfile(old_path):
                files.move(old_path, _badge_path(new_slug, ext))
                changed = True
    return changed


def _commit_with_badge(old_slug, new_slug, badge_png):
    """
    Flushes and commits the achievement the caller added or changed, together with its badge files.

    The row is flushed first, so a database problem shows up before any file is touched.
    The badge files are then written and the sprite rebuilt (a slow subprocess), and only
    then is the session committed. Returns None on success. On any failure the session is
    rolled back, the files are put back as they were and the JSON error response is returned.
    """
    files = _BadgeFiles()
    rebuilt = False
    try:
        db.session.flush()
        if _apply_badge_change(files, old_slug, new_slug, badge_png):
            _rebuild_sprite()
            rebuilt = True
        db.session.commit()
        return None
    except Exception as e:
        db.session.rollback()
        files.undo()
        if rebuilt:
            # The sprite was built from the files that were just put back.
            try:
                _rebuild_sprite()
            except _BadgeError:
                current_app.logger.exception("Could not rebuild the sprite sheet after undoing a badge change")
        if isinstance(e, _BadgeError):
            message = str(e)
        else:
            current_app.logger.exception(f"Error saving achievement badge: {e}")
            message = "Error saving the achievement."
        return jsonify({"status": "error", "message": message}), 500


def _parse_reward(value):
    """Return ``value`` as a whole number >= 1, or None if it is not one."""
    if isinstance(value, bool):
        return None
    try:
        if isinstance(value, float) and not value.is_integer():
            return None
        reward = int(value)
    except (TypeError, ValueError):
        return None
    return reward if reward >= 1 else None


def _certificate_dir():
    """Folder the certificate PDFs are written to."""
    return current_app.config.get(
        "UPLOAD_FOLDER", os.path.join(current_app.config["BASE_DIR"], "certificates")
    )


def _certificate_abs_path(cert):
    """Absolute path of ``cert``'s PDF, or None when the row has no file.

    New rows store only the file name, which lives in the upload folder. Older
    rows hold the absolute path of the host that saved them: that path is used
    while it still exists, otherwise the same name is looked up in the upload folder.
    """
    name = cert.stored_filename
    if not name:
        return None
    if os.path.isabs(cert.file_path) and os.path.exists(cert.file_path):
        return os.path.abspath(cert.file_path)
    return os.path.abspath(os.path.join(_certificate_dir(), name))


def _certificate_download_name(cert, with_id=False):
    """Safe ``<student>_<achievement>.pdf`` name; ``with_id`` keeps zip entries unique."""
    user = cert.user
    owner = secure_filename(user.nickname or "") or secure_filename(user.username or "")
    stem = secure_filename(f"{owner}_{cert.achievement.name}") or "certificate"
    if with_id or stem == "certificate":
        stem = f"{stem}_{cert.id}"
    return f"{stem}.pdf"


# API for the achievements data
@achievements.route("/all")
def get_achievements_json():
    """API endpoint to get all achievements and user's earned ones"""
    user_id = session.get("user")
    current_user = (
        User.query.options(joinedload(User.achievements)).filter_by(id=user_id).first()
    )

    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 404

    # Automatically check for new achievements when visiting the page
    from application.services.achievement_engine import (
        compute_user_stats,
        evaluate_user,
        get_achievement_progress,
    )

    evaluate_user(current_user)

    # Pre-calculate stats for speed
    stats = compute_user_stats(current_user)

    user_achievements = {ua.achievement_id for ua in current_user.achievements}
    all_achievements = Achievement.query.all()

    achievements_data = []
    for a in all_achievements:
        d = a.to_dict()
        curr, req = get_achievement_progress(current_user, a, stats=stats)
        d["current_progress"] = int(curr) if isinstance(curr, (int, float)) else curr
        d["requirement_value"] = req
        achievements_data.append(d)

    return jsonify(
        {
            "status": "success",
            "data": {
                "achievements": achievements_data,
                "user_achievements": list(user_achievements),
            },
        }
    )


@achievements.route("/add", methods=["POST"])
@admin_only
def add_achievement():
    data = request.get_json() if request.is_json else request.form

    name = data.get("name")
    slug = data.get("slug")
    description = data.get("description")
    achievement_type = data.get("type", "ducks")
    raw_reward = data.get("reward")
    requirement_value = data.get("requirement_value") or None
    source = data.get("source")

    if not name or not slug:
        return (
            jsonify({"status": "error", "message": "Name and Slug are required."}),
            400,
        )

    if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
        return jsonify({"status": "error", "message": SLUG_ERROR}), 400

    reward = 1 if raw_reward in (None, "") else _parse_reward(raw_reward)
    if reward is None:
        return jsonify({"status": "error", "message": REWARD_ERROR}), 400

    # Check for existing slug
    existing = Achievement.query.filter_by(slug=slug).first()
    if existing:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Achievement with this slug already exists.",
                }
            ),
            400,
        )

    # Handle Badge Upload: validate it before anything is created or written
    badge_png = None
    badge_file = request.files.get("badge")
    if badge_file and badge_file.filename != "":
        allowed_badge_ext = {"png", "jpg", "jpeg", "webp"}
        if not allowed_file(badge_file.filename, allowed_badge_ext):
            return (
                jsonify({"status": "error", "message": "Invalid badge file type."}),
                400,
            )
        try:
            badge_png = _prepare_badge(badge_file).data
        except ImageUploadError as e:
            return jsonify({"status": "error", "message": e.message}), e.status

    ach = Achievement(
        name=name,
        slug=slug,
        type=achievement_type,
        reward=reward,
        description=description,
        requirement_value=requirement_value,
        source=source,
    )
    db.session.add(ach)

    # The row is created first; the badge is saved to
    # current_app.static_folder / "images" / "achievement_badges" and the sprite rebuilt
    # before the commit, so a failure leaves neither a row nor a badge behind.
    failure = _commit_with_badge(None, slug, badge_png)
    if failure:
        return failure

    return jsonify(
        {"status": "success", "message": f"Achievement '{name}' added successfully!"}
    )

@achievements.route("/edit/<int:id>", methods=["PUT"])
@admin_only
def edit_achievement(id):
    ach = Achievement.query.get(id)
    if not ach:
        return jsonify({"status": "error", "message": "Achievement not found."}), 404

    data = request.form
    name = data.get("name")
    slug = data.get("slug")
    description = data.get("description")
    achievement_type = data.get("type")
    reward = data.get("reward")
    requirement_value = data.get("requirement_value")
    source = data.get("source")

    # Validate before touching ``ach``. An unchanged slug is accepted as-is so an
    # achievement created before slugs were restricted can still be edited.
    if slug and slug != ach.slug and not SLUG_RE.fullmatch(slug):
        return jsonify({"status": "error", "message": SLUG_ERROR}), 400
    new_reward = None
    if reward:
        new_reward = _parse_reward(reward)
        if new_reward is None:
            return jsonify({"status": "error", "message": REWARD_ERROR}), 400
    if slug:
        existing = Achievement.query.filter(Achievement.slug == slug, Achievement.id != id).first()
        if existing:
            return jsonify({"status": "error", "message": "Achievement with this slug already exists."}), 400

    badge_png = None
    badge_file = request.files.get("badge")
    if badge_file and badge_file.filename != "":
        allowed_badge_ext = {"png", "jpg", "jpeg", "webp"}
        if not allowed_file(badge_file.filename, allowed_badge_ext):
            return jsonify({"status": "error", "message": "Invalid badge file type."}), 400
        # An unchanged slug is not re-validated above, so a stored slug that predates
        # SLUG_RE must still never be able to write outside the badge directory.
        if not _badge_slug_is_safe(slug or ach.slug):
            return jsonify({"status": "error", "message": SLUG_ERROR}), 400
        try:
            badge_png = _prepare_badge(badge_file).data
        except ImageUploadError as e:
            return jsonify({"status": "error", "message": e.message}), e.status

    old_slug = ach.slug
    if name: ach.name = name
    if slug: ach.slug = slug
    if description is not None: ach.description = description
    if achievement_type: ach.type = achievement_type
    if new_reward is not None: ach.reward = new_reward
    if requirement_value is not None: ach.requirement_value = requirement_value
    if source is not None: ach.source = source

    # A renamed slug moves the badge along; a new badge replaces it. The sprite is rebuilt
    # before the commit, and a failure puts the previous badge files back.
    failure = _commit_with_badge(old_slug, ach.slug, badge_png)
    if failure:
        return failure
    return jsonify({"status": "success", "message": f"Achievement '{ach.name}' updated successfully!"})

@achievements.route("/submit_certificate", methods=["POST"])
def submit_certificate():
    user_id = session.get("user")
    current_user = User.query.filter_by(id=user_id).first()
    if not current_user:
        return jsonify({"success": False, "error": "User not found!"}), 400

    data = request.get_json(silent=True) or request.form
    url = data.get("certificate_url")
    url = url.strip() if isinstance(url, str) else ""

    # 1. Check URL
    match = None
    if len(url) <= MAX_CERT_URL_LENGTH:
        match = re.fullmatch(CERT_URL_REGEX, url)
    if not match:
        return jsonify({"success": False, "error": "Invalid certificate URL."}), 400

    course_slug = match.group(1)

    from application.utilities.db_helpers import resolve_course_id
    db_course_id = resolve_course_id(course_slug)

    achievement = Achievement.query.filter(
        (Achievement.slug == course_slug) |
        (Achievement.source == course_slug) |
        (Achievement.slug == db_course_id) |
        (Achievement.source == db_course_id)
    ).first()

    is_auto_recommended = False
    recommendation_reason = "No matching achievement found for this course."
    if achievement:
        is_auto_recommended = True
        recommendation_reason = f"Valid certificate URL matching achievement '{achievement.name}'."
    else:
        return jsonify({
            "success": False,
            "error": "No matching achievement found for this course."
        }), 422

    # 2. Handle File (Upload or Generate)
    file = request.files.get("certificate_file")

    cert_dir = _certificate_dir()
    os.makedirs(cert_dir, exist_ok=True)
    filename = secure_filename(f"{current_user.username}_{achievement.slug}.pdf")
    filepath = os.path.join(cert_dir, filename)

    if file and file.filename:
        from application.utilities.helper_functions import allowed_file
        if not allowed_file(file.filename, {'pdf'}):
            return jsonify({"success": False, "error": "Invalid file type. Only PDF is allowed."}), 400
        file.save(filepath)
    else:
        from application.utilities.cert_generator import generate_certificate

        # Use Alice_CS1.pdf as our template
        template_path = os.path.join(current_app.config["BASE_DIR"], "mockups", "Certificate_Samples", "CodeCombat", "Alice_CS1.pdf")
        student_name = current_user.nickname or current_user.username

        try:
            generate_certificate(template_path, filepath, student_name)
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to generate certificate: {e}"}), 500

    # 3. Create or update cert entry
    cert = UserCertificate.query.filter_by(
        user_id=current_user.id, achievement_id=achievement.id
    ).first()

    if not cert:
        cert = UserCertificate(
            user_id=current_user.id,
            achievement_id=achievement.id,
            url=url,
            file_path=filename,
            status="pending",
            is_auto_recommended=is_auto_recommended,
            recommendation_reason=recommendation_reason

        )
        db.session.add(cert)
    else:
        cert.url = url
        cert.file_path = filename
        # A resubmission always requires fresh admin review — never
        # auto-approve just because a prior submission existed.
        cert.status = "pending"
        cert.reviewed_at = None

    db.session.commit()

    # Success return
    return jsonify(
        {"success": True, "message": "Certificate submitted successfully."}
    )


@achievements.route("/view_certificate/<int:cert_id>")
def view_certificate(cert_id):
    # Intentionally public: certificates are shareable achievements, and this
    # tradeoff is disclosed and accepted during onboarding.
    cert = db.get_or_404(UserCertificate, cert_id)
    full_path = _certificate_abs_path(cert)

    if not full_path or not os.path.exists(full_path):
        flash("Certificate file not found on the server.", "error")
        return "File Not Found", 404  # Returns a 404 status code

    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)
    return send_from_directory(directory, filename, mimetype="application/pdf")


@achievements.route("/admin/certificates")
@admin_only
@api_response
def admin_certificates():
    # Only show pending certificates by default, matching the template.
    # The joins used for filtering also load the student and the achievement that
    # to_dict() reads, so the list is one query however many certificates there are.
    certs = (
        db.session.query(UserCertificate)
        .filter_by(status="pending")
        .join(User)
        .join(Achievement)
        .options(
            contains_eager(UserCertificate.user),
            contains_eager(UserCertificate.achievement),
        )
        .order_by(UserCertificate.submitted_at, UserCertificate.id)
        .all()
    )

    return {"certificates": [c.to_dict() for c in certs]}


def _send_certificate_approval_email(cert):
    from application.services.email_service import send_email

    # We want absolute URLs
    # request.host_url gives something like "https://blossom.benmega.com/"
    # If not in request context, this might fail, but mark_reviewed is in request context.
    base_url = request.host_url.rstrip("/")
    download_link = f"{base_url}/api/achievements/download_certificate/{cert.id}"
    profile_link = f"{base_url}/profile/{cert.user.slug}"

    subject = f"Certificate Approved: {cert.achievement.name} - {cert.user.username}"
    body = f"""A new certificate has been approved!

Certificate: {cert.achievement.name}
Student: {cert.user.nickname or cert.user.username}

Download Certificate:
{download_link}

View Student Profile:
{profile_link}
"""
    to_addresses = ["me@benmega.com", "benmega@gmail.com"]
    send_email(subject, body, to_addresses)


@achievements.route("/admin/certificates/reviewed/<int:cert_id>", methods=["POST"])
@admin_only
def mark_reviewed(cert_id):
    cert = db.get_or_404(UserCertificate, cert_id)
    cert.status = "approved"
    cert.reviewed_at = datetime.utcnow()
    db.session.commit()

    from application.socket_events import emit_activity_resolved

    emit_activity_resolved(cert.user_id, "certificate", cert.id, "approved")

    from application.services.achievement_engine import evaluate_user

    evaluate_user(cert.user, force=True)

    _send_certificate_approval_email(cert)

    return jsonify({"status": "success", "message": "Certificate marked as reviewed."})


@achievements.route("/admin/certificates/reject/<int:cert_id>", methods=["POST"])
@admin_only
def reject_certificate(cert_id):
    cert = db.get_or_404(UserCertificate, cert_id)
    data = request.get_json(silent=True) or {}
    cert.status = "rejected"
    cert.review_note = data.get("review_note")
    cert.reviewed_at = datetime.utcnow()
    db.session.commit()

    from application.socket_events import emit_activity_resolved

    emit_activity_resolved(cert.user_id, "certificate", cert.id, "rejected")

    return jsonify({"status": "success", "message": "Certificate rejected."})


@achievements.route("/download_certificate/<int:cert_id>")
def download_certificate(cert_id):
    # Intentionally public — see view_certificate.
    cert = db.get_or_404(UserCertificate, cert_id)
    full_path = _certificate_abs_path(cert)

    if not full_path or not os.path.exists(full_path):
        flash("Certificate file not found on the server.", "error")
        # The achievements page is a React route (served as the SPA index)
        return redirect(request.referrer or "/achievements")

    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)

    return send_from_directory(
        directory,
        filename,
        as_attachment=True,
        download_name=_certificate_download_name(cert),
    )


@achievements.route("/admin/certificates/reviewed/all", methods=["POST"])
@admin_only
def mark_all_reviewed():
    certs = db.session.query(UserCertificate).filter_by(status="pending").all()
    now = datetime.utcnow()
    users_to_evaluate = set()
    for cert in certs:
        cert.status = "approved"
        cert.reviewed_at = now
        users_to_evaluate.add(cert.user)
    db.session.commit()

    from application.socket_events import emit_activity_resolved

    for cert in certs:
        emit_activity_resolved(cert.user_id, "certificate", cert.id, "approved")
        _send_certificate_approval_email(cert)

    from application.services.achievement_engine import evaluate_user

    for user in users_to_evaluate:
        evaluate_user(user, force=True)

    return jsonify(
        {
            "status": "success",
            "message": f"{len(certs)} certificates marked as reviewed.",
        }
    )


@achievements.route("/admin/certificates/download_all")
@admin_only
def download_all_certificates():
    certs = (
        db.session.query(UserCertificate)
        .filter_by(status="pending")
        .join(User)
        .join(Achievement)
        .all()
    )

    if not certs:
        flash("No certificates to download.", "error")
        return redirect(request.referrer or url_for("achievements.admin_certificates"))

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as zf:
        used_names = set()
        for cert in certs:
            full_path = _certificate_abs_path(cert)
            if full_path and os.path.exists(full_path):
                filename = _certificate_download_name(cert)
                if filename in used_names:
                    # Two students (or two courses) can share a nickname
                    filename = _certificate_download_name(cert, with_id=True)
                used_names.add(filename)
                zf.write(full_path, filename)

    memory_file.seek(0)
    return send_file(
        memory_file,
        mimetype="application/zip",
        as_attachment=True,
        download_name="all_pending_certificates.zip",
    )

@achievements.route("/admin/certificate_templates")
@admin_only
@api_response
def admin_certificate_templates():
    courses: list[dict[str, Any]] = [
        {"id": "cs-1", "name": "Computer Science 1"},
        {"id": "cs-2", "name": "Computer Science 2"},
        {"id": "cs-3", "name": "Computer Science 3"},
        {"id": "cs-4", "name": "Computer Science 4"},
        {"id": "cs-5", "name": "Computer Science 5"},
        {"id": "cs-6", "name": "Computer Science 6"},
        {"id": "gd-1", "name": "Game Development 1"},
        {"id": "gd-2", "name": "Game Development 2"},
        {"id": "gd-3", "name": "Game Development 3"},
        {"id": "wd-1", "name": "Web Development 1"},
        {"id": "wd-2", "name": "Web Development 2"},
        {"id": "oz-1", "name": "Ozaria 1"},
        {"id": "oz-2", "name": "Ozaria 2"},
        {"id": "oz-3", "name": "Ozaria 3"},
        {"id": "oz-4", "name": "Ozaria 4"}
    ]
    templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
    result = []
    for c in courses:
        path = os.path.join(templates_dir, f"{c['id']}.pdf")
        has_template = os.path.exists(path)
        c["has_template"] = has_template
        c["course_id"] = c["id"]
        c["course_name"] = c["name"]
        if has_template:
            c["preview_url"] = url_for("achievements.admin_certificate_templates_view", course_id=c["id"])
        else:
            c["preview_url"] = None
        result.append(c)
    return {"templates": result}

@achievements.route("/admin/certificate_templates/<course_id>/view")
@admin_only
def admin_certificate_templates_view(course_id):
    from application.utilities.cert_generator import generate_certificate
    from application.utilities.db_helpers import get_canonical_course_slug, resolve_course_id

    templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
    canonical_slug = get_canonical_course_slug(course_id)
    mongo_id = resolve_course_id(course_id)

    candidates = [course_id, canonical_slug, mongo_id]
    for c in candidates:
        if not c:
            continue
        file_path = os.path.join(templates_dir, f"{c}.pdf")
        if os.path.exists(file_path):
            return send_from_directory(templates_dir, f"{c}.pdf", mimetype="application/pdf")

    # Fallback: Dynamically generate sample preview PDF so iframe view NEVER returns 404
    try:
        pdf_bytes = generate_certificate(course_id, None, "Sample Student")
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=False,
            download_name=f"{course_id}_template_preview.pdf"
        )
    except Exception as e:
        return jsonify({"status": "error", "success": False, "error": str(e)}), 500


@achievements.route("/admin/certificate_templates/<course_id>/upload", methods=["POST"])
@admin_only
def admin_certificate_templates_upload(course_id):
    from application.utilities.db_helpers import get_canonical_course_slug, resolve_course_id

    file = request.files.get("template_file") or request.files.get("file")
    if not file or not file.filename:
        return jsonify({"status": "error", "success": False, "error": "No file uploaded"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"status": "error", "success": False, "error": "Only PDF files allowed"}), 400

    templates_dir = os.path.join(os.path.dirname(__file__), "..", "static", "certificate_templates")
    os.makedirs(templates_dir, exist_ok=True)

    canonical_slug = get_canonical_course_slug(course_id)
    mongo_id = resolve_course_id(course_id)

    file_bytes = file.read()
    save_names = {f"{course_id}.pdf", f"{canonical_slug}.pdf", f"{mongo_id}.pdf"}
    for fname in save_names:
        with open(os.path.join(templates_dir, fname), "wb") as f:
            f.write(file_bytes)

    return jsonify({
        "status": "success",
        "success": True,
        "message": "Template uploaded successfully."
    })


@achievements.route("/admin/certificate_templates/<course_id>/test_generate", methods=["POST"])
@admin_only
def admin_certificate_templates_test_generate(course_id):
    data = request.get_json(silent=True) or request.form
    student_name = data.get("student_name", "Test Student")

    from application.utilities.cert_generator import generate_certificate
    try:
        pdf_bytes = generate_certificate(course_id, None, student_name)
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"test_{course_id}.pdf"
        )
    except Exception as e:
        return jsonify({"status": "error", "success": False, "error": str(e)}), 500
