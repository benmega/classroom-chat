import math
import re
from datetime import timedelta

from sqlalchemy import case, event, func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.hybrid import hybrid_property
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..utilities.helper_functions import utc_today, utcnow_naive

# Models are imported locally within methods to prevent circular dependencies


def default_nickname(context):
    return context.get_current_parameters().get("username")


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    _username = db.Column("username", db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    profile_picture = db.Column(db.String(150), default="Default_pfp.jpg")
    ip_address = db.Column(db.String(45), nullable=True)
    is_online = db.Column(db.Boolean, default=False)
    nickname = db.Column(db.String(50), nullable=False, default=default_nickname)
    slug = db.Column(db.String(100), unique=True, nullable=True)
    is_approved = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default="student", nullable=False)
    active_track = db.Column(
        db.String(50), default="cs", server_default="cs", nullable=False
    )
    can_chat = db.Column(db.Boolean, default=True)

    # OAuth / Cognito fields
    email = db.Column(db.String(120), unique=True, nullable=True)
    cognito_sub = db.Column(db.String(50), unique=True, nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow_naive)
    has_seen_tutorial = db.Column(db.Boolean, default=False)
    current_activity = db.Column(db.String(255), nullable=True)
    last_activity_time = db.Column(db.DateTime, nullable=True)

    # Gamification
    packets = db.Column(db.Double, nullable=False, default=0)
    earned_ducks = db.Column(db.Double, nullable=False, default=0)
    duck_balance = db.Column(db.Double, nullable=False, default=0)
    last_daily_duck = db.Column(db.Date, nullable=True)
    last_achievement_evaluation = db.Column(db.DateTime, nullable=True)
    connection_code = db.Column(db.String(10), unique=True, nullable=True)
    drawer = db.Column(db.String(4), unique=True, nullable=True)

    # Shop Perks
    has_chat_font = db.Column(db.Boolean, default=False)
    chat_font_color = db.Column(db.String(7), nullable=True)
    has_animated_border = db.Column(db.Boolean, default=False)
    animated_border_speed = db.Column(db.String(10), default="normal")
    animated_border_color = db.Column(db.String(7), nullable=True)
    has_auto_bitshift = db.Column(db.Boolean, default=False)
    has_custom_wallpaper = db.Column(db.Boolean, default=False)
    profile_wallpaper = db.Column(db.String(255), nullable=True)
    # Note: This perk does not automate periodic rewards (which are given automatically anyway),
    # but rather unlocks a frontend bookmarklet for CodeCombat/Ozaria auto-claiming.
    has_auto_claimer = db.Column(db.Boolean, default=False)
    has_double_duck = db.Column(db.Boolean, default=False)

    # Relationships
    skills = db.relationship(
        "Skill", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    projects = db.relationship(
        "Project", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    achievements = db.relationship(
        "UserAchievement", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    certificates = db.relationship(
        "UserCertificate", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    challenge_logs = db.relationship(
        "ChallengeLog",
        primaryjoin="User.id == foreign(ChallengeLog.user_id)",
        lazy="dynamic",
        viewonly=True,
    )

    # Many-to-many classroom enrollment via user_classrooms join table
    classrooms = db.relationship(
        "Classroom",
        secondary="user_classrooms",
        back_populates="users",
        lazy="select",
    )

    notes = db.relationship(
        "Note",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(Note.created_at)",
    )

    # Parent → Student relationship via association table
    children = db.relationship(
        "User",
        secondary="parent_students",
        primaryjoin="User.id == parent_students.c.parent_id",
        secondaryjoin="User.id == parent_students.c.student_id",
        lazy="select",
        backref=db.backref("parents", lazy="select"),
    )

    def __repr__(self):
        return f"<User {self._username}>"

    def to_dict(self):
        d = self.to_dict_summary()

        # Relationships (serialized) - Expensive, only for single user view
        d["skills"] = [
            s.to_dict() if hasattr(s, "to_dict") else {"id": s.id, "name": s.name}
            for s in self.skills
        ]
        d["projects"] = [
            p.to_dict() if hasattr(p, "to_dict") else {"id": p.id, "name": p.name}
            for p in self.projects
        ]
        d["certificates"] = [
            c.to_dict() if hasattr(c, "to_dict") else {"id": c.id}
            for c in self.certificates
        ]
        d["achievements"] = [
            a.to_dict() if hasattr(a, "to_dict") else {"id": a.id}
            for a in self.achievements
        ]
        d["notes"] = [
            (
                n.to_dict()
                if hasattr(n, "to_dict")
                else {"id": n.id, "url": f"/notes/view/{n.filename}"}
            )
            for n in self.notes
        ]

        # Grid data - Extremely expensive
        d["contribution_data"] = self.get_contribution_data()

        # Course progress tree breakdown
        d["course_progress"] = self.get_course_progress_data()

        return d

    @property
    def has_activity(self):
        from .challenge_log import ChallengeLog
        from .course_instance_request import CourseInstanceRequest
        from .submission import Submission
        from .user_certificate import UserCertificate

        if ChallengeLog.query.filter_by(user_id=self.id).first():
            return True
        if Submission.query.filter_by(user_id=self.id).first():
            return True
        if UserCertificate.query.filter_by(user_id=self.id).first():
            return True
        return bool(CourseInstanceRequest.query.filter_by(student_id=self.id).first())

    def to_dict_auth(self):
        """Ultra-lightweight dictionary for frequent auth status checks."""
        return {
            "id": self.id,
            "user_id": self.id,
            "username": self._username,
            "nickname": self.nickname,
            "bio": self.bio,
            "profile_picture": self.profile_picture,
            "profile_picture_url": (
                f"/user/profile_pictures/{self.profile_picture}"
                if self.profile_picture
                else "/static/images/Default_pfp.jpg"
            ),
            "is_approved": self.is_approved,
            "role": self.role,
            "active_track": self.active_track,

            "slug": self.slug,
            "duck_balance": self.duck_balance,
            "packets": self.packets,
            "has_seen_tutorial": self.has_seen_tutorial,
            "has_chat_font": self.has_chat_font,
            "chat_font_color": self.chat_font_color,
            "has_animated_border": self.has_animated_border,
            "animated_border_speed": self.animated_border_speed,
            "animated_border_color": self.animated_border_color,
            "has_auto_bitshift": self.has_auto_bitshift,
            "has_custom_wallpaper": self.has_custom_wallpaper,
            "profile_wallpaper": self.profile_wallpaper,
            "has_auto_claimer": self.has_auto_claimer,
            "has_double_duck": self.has_double_duck,
            "drawer": self.drawer,
            "current_activity": self.current_activity,
            "last_activity_time": self.last_activity_time.isoformat()
            if self.last_activity_time
            else None,
            "has_activity": self.has_activity,
            "achievement_count": len(self.achievements),
            "can_chat": self.can_chat if self.can_chat is not None else True,
        }

    @classmethod
    def build_progress_map(cls, users):
        """Challenge-log counts per (username, domain) for a batch of users.

        Pass the result to to_dict_summary as `precomputed_progress`: one grouped
        query for the whole batch instead of several COUNT queries per user.
        """
        from .challenge_log import ChallengeLog

        id_to_username = {u.id: u._username for u in users}
        if not id_to_username:
            return {}

        counts = (
            db.session.query(
                ChallengeLog.user_id, ChallengeLog.domain, func.count(ChallengeLog.id)
            )
            .filter(ChallengeLog.user_id.in_(list(id_to_username)))
            .group_by(ChallengeLog.user_id, ChallengeLog.domain)
            .all()
        )
        return {
            (id_to_username[user_id], domain): count
            for user_id, domain, count in counts
        }

    @staticmethod
    def _challenge_totals():
        """Number of challenges in each progress domain (one grouped query)."""
        from .challenge import Challenge

        domains = ("codecombat.com", "www.ozaria.com")
        rows = (
            db.session.query(Challenge.domain, func.count(Challenge.id))
            .filter(Challenge.domain.in_(domains))
            .group_by(Challenge.domain)
            .all()
        )
        totals = dict.fromkeys(domains, 0)
        totals.update(dict(rows))
        return totals

    @staticmethod
    def _activity_user_ids(users):
        """Ids among `users` with any activity; the batch form of has_activity."""
        from .challenge_log import ChallengeLog
        from .course_instance_request import CourseInstanceRequest
        from .submission import Submission
        from .user_certificate import UserCertificate

        user_ids = [u.id for u in users]
        active = set()
        for column in (
            ChallengeLog.user_id,
            Submission.user_id,
            UserCertificate.user_id,
            CourseInstanceRequest.student_id,
        ):
            rows = db.session.query(column).filter(column.in_(user_ids)).distinct()
            active.update(user_id for (user_id,) in rows)
        return active

    @classmethod
    def to_dict_summaries(cls, users):
        """to_dict_summary() for each of `users` in a constant number of queries.

        The per-user progress, challenge totals and activity flag are computed
        once for the whole batch. Load the users with
        selectinload(User.projects) to keep the recent-project lookup flat too.
        """
        users = list(users)
        if not users:
            return []

        progress = cls.build_progress_map(users)
        totals = cls._challenge_totals()
        active_ids = cls._activity_user_ids(users)
        return [
            u.to_dict_summary(
                progress, challenge_totals=totals, activity_user_ids=active_ids
            )
            for u in users
        ]

    def to_dict_summary(
        self,
        precomputed_progress=None,
        challenge_totals=None,
        activity_user_ids=None,
    ):
        """Lighter dictionary for list views, avoids extremely expensive processing.

        List views should use to_dict_summaries(); the optional arguments are the
        batch-computed values it passes in (an empty precomputed_progress is valid
        and means "no challenge logs").
        """

        if precomputed_progress is not None:
            cc_levels = precomputed_progress.get((self._username, "codecombat.com"), 0)
            oz_levels = precomputed_progress.get((self._username, "www.ozaria.com"), 0)

            totals = (
                challenge_totals
                if challenge_totals is not None
                else self._challenge_totals()
            )
            cc_total = totals["codecombat.com"]
            oz_total = totals["www.ozaria.com"]

            cc_percent = (
                int(round((cc_levels / cc_total * 100), 0)) if cc_total > 0 else 0
            )
            oz_percent = (
                int(round((oz_levels / oz_total * 100), 0)) if oz_total > 0 else 0
            )
        else:
            cc_levels = self.get_progress("codecombat.com")
            oz_levels = self.get_progress("www.ozaria.com")
            cc_percent = self.get_progress_percent("codecombat.com")
            oz_percent = self.get_progress_percent("www.ozaria.com")
        d = {
            "id": self.id,
            "user_id": self.id,
            "username": self._username,
            "nickname": self.nickname,
            "profile_picture": self.profile_picture,
            "profile_picture_url": (
                f"/user/profile_pictures/{self.profile_picture}"
                if self.profile_picture
                else "/static/images/Default_pfp.jpg"
            ),
            "is_online": self.is_online,
            "is_approved": self.is_approved,
            "role": self.role,
            "active_track": self.active_track,
            "bio": self.bio,
            "slug": self.slug,
            # Gamification
            "duck_balance": self.duck_balance,
            "earned_ducks": self.earned_ducks,
            "packets": self.packets,
            # Progress counters
            "total_levels": cc_levels + oz_levels,
            "completed_challenges_count": cc_levels + oz_levels,
            "cc_levels": cc_levels,
            "oz_levels": oz_levels,
            "cc_percent": cc_percent,
            "oz_percent": oz_percent,
            "has_seen_tutorial": self.has_seen_tutorial,
            "has_chat_font": self.has_chat_font,
            "chat_font_color": self.chat_font_color,
            "has_animated_border": self.has_animated_border,
            "animated_border_speed": self.animated_border_speed,
            "animated_border_color": self.animated_border_color,
            "has_auto_bitshift": self.has_auto_bitshift,
            "has_custom_wallpaper": self.has_custom_wallpaper,
            "profile_wallpaper": self.profile_wallpaper,
            "has_auto_claimer": self.has_auto_claimer,
            "has_double_duck": self.has_double_duck,
            "drawer": self.drawer,
            "current_activity": self.current_activity,
            "last_activity_time": self.last_activity_time.isoformat()
            if self.last_activity_time
            else None,
            "has_activity": (
                self.id in activity_user_ids
                if activity_user_ids is not None
                else self.has_activity
            ),
            "recent_project": {
                "name": self.projects[-1].name,
            }
            if self.projects
            else None,
            "can_chat": self.can_chat if self.can_chat is not None else True,
        }
        return d

    @hybrid_property
    def username(self):
        return self._username

    @username.setter
    def username(self, value):
        self._username = value.lower()

    def generate_slug(self):
        """Generate a unique kebab-case slug from the user's nickname."""
        source = self.nickname if self.nickname else self._username
        base_slug = re.sub(r"[_\s]+", "-", source.lower())
        base_slug = re.sub(r"[^a-z0-9-]", "", base_slug)
        base_slug = re.sub(r"-+", "-", base_slug).strip("-")

        slug = base_slug
        counter = 1
        while User.query.filter_by(slug=slug).first() is not None:
            slug = f"{base_slug}-{counter}"
            counter += 1

        self.slug = slug
        return slug

    def get_connection_code(self):
        if not self.connection_code:
            self.connection_code = self.generate_connection_code()
            db.session.commit()
        return self.connection_code

    def generate_connection_code(self):
        """Generate a unique 6-character alphanumeric connection code."""
        import random
        import string

        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if User.query.filter_by(connection_code=code).first() is None:
                return code

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @classmethod
    def set_online(cls, user_id, online=True):
        """Toggle user online/offline and manage session logs."""
        user = cls.query.filter_by(id=user_id).first()
        if not user:
            return

        from .session_log import SessionLog

        # The session log and is_online change together in a single commit.
        if online:
            # Returns the already-open session if there is one
            SessionLog.start_session(user.id, commit=False)
            user.is_online = True
        else:
            SessionLog.end_session(user.id, commit=False)
            user.is_online = False

        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

    def get_progress(self, domain):
        """Calculate progress based on challenges completed for a specific domain."""
        from .challenge_log import ChallengeLog

        total_challenges = ChallengeLog.query.filter(
            (ChallengeLog.user_id == self.id) &
            ((ChallengeLog.domain == domain) | (ChallengeLog.course_id == domain))
        ).count()
        return total_challenges  # Modify if you want percentages based on predefined thresholds.

    def get_progress_percent(self, domain):
        """Calculate CodeCombat progress as a percentage of completed challenges (rounded for readability)."""
        from .challenge import Challenge

        total_challenges = Challenge.query.filter_by(domain=domain).count()
        from .challenge_log import ChallengeLog

        completed_challenges = ChallengeLog.query.filter_by(
            user_id=self.id, domain=domain
        ).count()

        progress = (
            (completed_challenges / total_challenges) * 100
            if total_challenges > 0
            else 0
        )
        return int(round(progress, 0))

    def get_course_progress_data(self):
        from .challenge_log import ChallengeLog
        from .course import Course

        cc_levels = self.get_progress("codecombat.com")
        cc_percent = self.get_progress_percent("codecombat.com")
        oz_levels = self.get_progress("www.ozaria.com")
        oz_percent = self.get_progress_percent("www.ozaria.com")

        # Query all courses at once to avoid N+1 queries during breakdown generation
        courses_dict = {course.id: course.name for course in Course.query.all()}

        def get_course_breakdown(domain):
            from .challenge import Challenge

            user_logs = ChallengeLog.query.filter_by(
                user_id=self.id, domain=domain
            ).all()
            completed_slugs = {cl.challenge_slug for cl in user_logs}

            all_challenges = Challenge.query.filter_by(domain=domain).order_by(Challenge.sequence).all()

            courses_map = {}
            for c in all_challenges:
                if c.course_id not in courses_map:
                    courses_map[c.course_id] = []
                courses_map[c.course_id].append(c)

            breakdown = []
            for course_id, challenges in courses_map.items():
                course_name = "Other"
                if course_id:
                    course_name = courses_dict.get(course_id, course_id)

                levels = []
                completed_count = 0
                for c in challenges:
                    is_completed = c.slug in completed_slugs
                    if is_completed:
                        completed_count += 1
                    levels.append(
                        {"name": c.name, "slug": c.slug, "sequence": c.sequence, "is_completed": is_completed}
                    )

                if len(levels) > 0:
                    breakdown.append(
                        {
                            "course_id": course_id,
                            "course_name": course_name,
                            "levels_completed": completed_count,
                            "levels_total": len(levels),
                            "levels": levels,
                        }
                    )

            handled_course_ids = set(courses_map.keys())
            legacy_courses = {}
            for cl in user_logs:
                if cl.course_id and cl.course_id not in handled_course_ids:
                    if cl.course_id not in legacy_courses:
                        legacy_courses[cl.course_id] = []
                    if not any(
                        lvl["slug"] == cl.challenge_slug
                        for lvl in legacy_courses[cl.course_id]
                    ):
                        legacy_courses[cl.course_id].append(
                            {
                                "name": cl.challenge_slug,
                                "slug": cl.challenge_slug,
                                "sequence": None,
                                "is_completed": True,
                            }
                        )

            for course_id, levels in legacy_courses.items():
                course_name = (
                    courses_dict.get(course_id, course_id) if course_id else "Other"
                )
                breakdown.append(
                    {
                        "course_id": course_id,
                        "course_name": course_name,
                        "levels_completed": len(levels),
                        "levels_total": len(levels),
                        "levels": levels,
                    }
                )

            breakdown.sort(key=lambda x: x["levels_completed"], reverse=True)
            return breakdown

        return {
            "codecombat": {
                "levels_completed": cc_levels,
                "percent": cc_percent,
                "breakdown": get_course_breakdown("codecombat.com"),
            },
            "ozaria": {
                "levels_completed": oz_levels,
                "percent": oz_percent,
                "breakdown": get_course_breakdown("www.ozaria.com"),
            },
        }

    def add_ducks(self, amount, reason=None, min_balance=None):
        """Credit (or debit) ducks and log a DuckTransaction.

        Returns True when the change was applied and False when it was not:
        parents never hold ducks, and with ``min_balance`` set the change is
        refused if it would leave duck_balance below that value.  Non-finite
        amounts raise ValueError.

        For a persisted user the balances change in a single SQL UPDATE
        (``col = col + amount``) rather than read-modify-write on the loaded
        instance, so concurrent credits/debits (trades, achievements, admin
        adjustments) cannot overwrite each other; the instance is refreshed
        from the row afterwards.  The caller must commit the session.
        """
        if self.role == "parent":
            return False

        if not math.isfinite(amount):
            raise ValueError("amount must be a finite number")

        # Note: Packets are no longer earned here. They are earned via projects or admin adjustment.
        earned_gain = amount if amount > 0 else 0

        if self.id is not None and self in db.session:
            new_balance = User.duck_balance + amount
            new_earned = User.earned_ducks + earned_gain
            update_stmt = update(User).where(User.id == self.id)
            if min_balance is not None:
                update_stmt = update_stmt.where(new_balance >= min_balance)
            result = db.session.execute(
                update_stmt.values(
                    duck_balance=new_balance,
                    # Invariant: earned_ducks >= duck_balance at all times.
                    # earned_ducks is a lifetime counter (never decremented by spending or penalties).
                    # If duck_balance somehow exceeds earned_ducks (e.g. due to legacy migration data),
                    # clamp earned_ducks up to duck_balance so the invariant always holds.
                    earned_ducks=case(
                        (new_earned < new_balance, new_balance), else_=new_earned
                    ),
                ).execution_options(synchronize_session=False)
            )
            if result.rowcount != 1:
                return False
            db.session.refresh(self, ["duck_balance", "earned_ducks"])
        else:
            # Not persisted yet (no row to update): plain in-memory arithmetic.
            if min_balance is not None and self.duck_balance + amount < min_balance:
                return False
            self.earned_ducks += earned_gain
            self.duck_balance += amount
            if self.earned_ducks < self.duck_balance:
                self.earned_ducks = self.duck_balance

        # Record the transaction
        from .duck_transaction import DuckTransaction

        transaction = DuckTransaction(user_id=self.id, amount=amount, reason=reason)
        db.session.add(transaction)
        # Note: The caller must commit the session
        return True

    def award_daily_duck(self, amount=1):
        if self.role == "parent":
            return False

        if self.has_double_duck:
            amount *= 2

        # The day boundary is UTC, like every other timestamp in the app.
        today = utc_today()
        if self.last_daily_duck == today:
            return False

        if self.id is not None and self in db.session:
            # Claim today with a conditional UPDATE before awarding, so two
            # concurrent logins cannot both pass the check above and both award.
            claimed = db.session.execute(
                update(User)
                .where(
                    User.id == self.id,
                    or_(User.last_daily_duck.is_(None), User.last_daily_duck != today),
                )
                .values(last_daily_duck=today)
                .execution_options(synchronize_session=False)
            )
            if claimed.rowcount != 1:
                return False
            db.session.refresh(self, ["last_daily_duck"])
        else:
            self.last_daily_duck = today

        # Note: The caller must commit the session
        return self.add_ducks(amount, reason="Daily Duck")

    def get_contribution_data(self):
        """
        Prepares data for a GitHub-style contribution graph.
        Returns: {
            'months': [{'name': 'Jan', 'colspan': 4}, ...],
            'rows': [[{date, count, level}, ...], ...] # 7 rows (Sun-Sat)
        }
        """
        # Align end date to the coming Saturday to complete the grid
        today = utc_today()
        idx = (today.weekday() + 1) % 7  # 0 = Sun
        end_date = today + timedelta(days=(6 - idx))
        start_date = end_date - timedelta(weeks=52)

        from sqlalchemy import func

        from .challenge_log import ChallengeLog

        results = (
            db.session.query(
                func.date(ChallengeLog.timestamp), func.count(ChallengeLog.id)
            )
            .filter(
                ChallengeLog.user_id == self.id,
                ChallengeLog.timestamp >= start_date,
                ChallengeLog.timestamp <= (end_date + timedelta(days=1)),
            )
            .group_by(func.date(ChallengeLog.timestamp))
            .all()
        )

        counts = {}
        for row in results:
            if not row[0]:
                continue
            k = row[0] if isinstance(row[0], str) else row[0].isoformat()
            counts[k] = row[1]

        # grid[weekday][week_index] (7 rows x 53 columns)
        grid = [[None for _ in range(53)] for _ in range(7)]

        current = start_date
        week_idx = 0

        # Track months for the header
        months = []
        current_month = None
        current_colspan = 0

        while current <= end_date:
            weekday = (current.weekday() + 1) % 7  # 0=Sun, 6=Sat

            if weekday == 0:  # Check at start of every week
                month_name = current.strftime("%b")
                if month_name != current_month:
                    if current_month:
                        months.append(
                            {"name": current_month, "colspan": current_colspan}
                        )
                    current_month = month_name
                    current_colspan = 0
                current_colspan += 1

            # Fill Cell Data
            iso_date = current.isoformat()
            c = counts.get(iso_date, 0)

            # Determine Level (0-4)
            if c == 0:
                level = 0
            elif c == 1:
                level = 1
            elif c <= 3:
                level = 2
            elif c <= 6:
                level = 3
            else:
                level = 4

            grid[weekday][week_idx] = {"date": iso_date, "count": c, "level": level}

            if weekday == 6:
                week_idx += 1

            current += timedelta(days=1)

        # Append final month segment
        if current_month:
            months.append({"name": current_month, "colspan": current_colspan})

        return {"months": months, "rows": grid}

    def get_completed_levels(self):
        """
        Returns a set of challenge slugs that the user has completed.
        """
        # Using a set removes duplicates.
        return {log.challenge_slug for log in self.challenge_logs}


# SQLAlchemy event listener to auto-generate slug for new users
@event.listens_for(User, "before_insert")
def receive_before_insert(mapper, connection, target):
    """Auto-generate slug before inserting a new user if not already set."""
    if not target.slug:
        target.generate_slug()


def save_new_user(user, commit=True):
    """Insert a new user, retrying once if its generated slug loses a race.

    The slug is generated inside the INSERT's flush (receive_before_insert), so
    two simultaneous signups with the same nickname can pick the same slug and
    the second violates the unique constraint. By then the winner is committed
    and visible, so regenerating the slug finds a free one.

    With commit=False the user is only flushed (e.g. to get its id first); the
    caller commits.
    """
    db.session.add(user)
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        user.slug = None
        user.generate_slug()
        db.session.add(user)
        db.session.flush()

    if commit:
        db.session.commit()
    return user
