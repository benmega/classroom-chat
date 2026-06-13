import re
from datetime import date, timedelta, datetime

from sqlalchemy import event
from sqlalchemy.ext.hybrid import hybrid_property
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
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
    is_admin = db.Column(db.Boolean, default=False)
    is_approved = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default="student", nullable=False)
    
    # OAuth / Cognito fields
    email = db.Column(db.String(120), unique=True, nullable=True)
    cognito_sub = db.Column(db.String(50), unique=True, nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    has_seen_tutorial = db.Column(db.Boolean, default=False)

    # Gamification
    packets = db.Column(db.Double, nullable=False, default=0)
    earned_ducks = db.Column(db.Double, nullable=False, default=0)
    duck_balance = db.Column(db.Double, nullable=False, default=0)
    last_daily_duck = db.Column(db.Date, nullable=True)
    last_achievement_evaluation = db.Column(db.DateTime, nullable=True)
    connection_code = db.Column(db.String(10), unique=True, nullable=True)

    # Shop Perks
    has_chat_font = db.Column(db.Boolean, default=False)
    chat_font_color = db.Column(db.String(7), nullable=True)
    has_animated_border = db.Column(db.Boolean, default=False)
    has_auto_bitshift = db.Column(db.Boolean, default=False)
    has_custom_wallpaper = db.Column(db.Boolean, default=False)
    profile_wallpaper = db.Column(db.String(255), nullable=True)
    has_auto_claimer = db.Column(db.Boolean, default=False)

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
        lazy="selectin",
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
        lazy="selectin",
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

    def to_dict_auth(self):
        """Ultra-lightweight dictionary for frequent auth status checks."""
        return {
            "id": self.id,
            "user_id": self.id,
            "username": self._username,
            "nickname": self.nickname,
            "profile_picture_url": (
                f"/user/profile_pictures/{self.profile_picture}"
                if self.profile_picture
                else "/static/images/Default_pfp.jpg"
            ),
            "is_admin": self.is_admin,
            "is_approved": self.is_approved,
            "role": self.role,
            "slug": self.slug,
            "duck_balance": self.duck_balance,
            "packets": self.packets,
            "completed_challenges_count": self.challenge_logs.count(),
            "has_seen_tutorial": self.has_seen_tutorial,
            "has_chat_font": self.has_chat_font,
            "chat_font_color": self.chat_font_color,
            "has_animated_border": self.has_animated_border,
            "has_auto_bitshift": self.has_auto_bitshift,
            "has_custom_wallpaper": self.has_custom_wallpaper,
            "profile_wallpaper": self.profile_wallpaper,
            "has_auto_claimer": self.has_auto_claimer,
        }

    def to_dict_summary(self, precomputed_progress=None):
        """Lighter dictionary for list views, avoids extremely expensive processing."""

        if precomputed_progress:
            cc_levels = precomputed_progress.get((self._username, "codecombat.com"), 0)
            oz_levels = precomputed_progress.get((self._username, "www.ozaria.com"), 0)

            from .challenge import Challenge

            if "codecombat.com" not in self._total_challenges_cache:
                self._total_challenges_cache["codecombat.com"] = (
                    Challenge.query.filter_by(domain="codecombat.com").count()
                )
            if "www.ozaria.com" not in self._total_challenges_cache:
                self._total_challenges_cache["www.ozaria.com"] = (
                    Challenge.query.filter_by(domain="www.ozaria.com").count()
                )

            cc_total = self._total_challenges_cache["codecombat.com"]
            oz_total = self._total_challenges_cache["www.ozaria.com"]

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
            "is_admin": self.is_admin,
            "is_approved": self.is_approved,
            "role": self.role,
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
            "has_auto_bitshift": self.has_auto_bitshift,
            "has_custom_wallpaper": self.has_custom_wallpaper,
            "profile_wallpaper": self.profile_wallpaper,
            "has_auto_claimer": self.has_auto_claimer,
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
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
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

        if online:
            from .session_log import SessionLog
            # Start new session if none active
            if not SessionLog.query.filter_by(user_id=user.id, end_time=None).first():
                SessionLog.start_session(user.id)
            user.is_online = True
        else:
            from .session_log import SessionLog
            # End the most recent session
            SessionLog.end_session(user.id)
            user.is_online = False

        db.session.commit()

    _total_challenges_cache = {}

    def get_progress(self, domain):
        """Calculate progress based on challenges completed for a specific domain."""
        from .challenge_log import ChallengeLog
        total_challenges = ChallengeLog.query.filter_by(
            user_id=self.id, domain=domain
        ).count()
        return total_challenges  # Modify if you want percentages based on predefined thresholds.

    def get_progress_percent(self, domain):
        """Calculate CodeCombat progress as a percentage of completed challenges (rounded for readability)."""
        from .challenge import Challenge

        if domain not in self._total_challenges_cache:
            self._total_challenges_cache[domain] = Challenge.query.filter_by(
                domain=domain
            ).count()

        total_challenges = self._total_challenges_cache[domain]
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

        def get_course_breakdown(domain):
            from .challenge import Challenge
            
            user_logs = ChallengeLog.query.filter_by(
                user_id=self.id, domain=domain
            ).all()
            completed_slugs = {cl.challenge_slug for cl in user_logs}
            
            all_challenges = Challenge.query.filter_by(domain=domain).all()
            
            courses_map = {}
            for c in all_challenges:
                if c.course_id not in courses_map:
                    courses_map[c.course_id] = []
                courses_map[c.course_id].append(c)
                
            breakdown = []
            for course_id, challenges in courses_map.items():
                course_name = "Other"
                if course_id:
                    course = db.session.get(Course, course_id)
                    course_name = course.name if course else course_id
                
                levels = []
                completed_count = 0
                for c in challenges:
                    is_completed = c.slug in completed_slugs
                    if is_completed:
                        completed_count += 1
                    levels.append({
                        "name": c.name,
                        "slug": c.slug,
                        "is_completed": is_completed
                    })
                
                if len(levels) > 0:
                    breakdown.append({
                        "course_id": course_id,
                        "course_name": course_name,
                        "levels_completed": completed_count,
                        "levels_total": len(levels),
                        "levels": levels
                    })
            
            handled_course_ids = set(courses_map.keys())
            legacy_courses = {}
            for cl in user_logs:
                if cl.course_id and cl.course_id not in handled_course_ids:
                    if cl.course_id not in legacy_courses:
                        legacy_courses[cl.course_id] = []
                    if not any(lvl["slug"] == cl.challenge_slug for lvl in legacy_courses[cl.course_id]):
                        legacy_courses[cl.course_id].append({
                            "name": cl.challenge_slug,
                            "slug": cl.challenge_slug,
                            "is_completed": True
                        })
                        
            for course_id, levels in legacy_courses.items():
                course = db.session.get(Course, course_id)
                breakdown.append({
                    "course_id": course_id,
                    "course_name": course.name if course else course_id,
                    "levels_completed": len(levels),
                    "levels_total": len(levels),
                    "levels": levels
                })
            
            breakdown.sort(key=lambda x: x["levels_completed"], reverse=True)
            return breakdown

        return {
            "codecombat": {
                "levels_completed": cc_levels,
                "percent": cc_percent,
                "breakdown": get_course_breakdown("codecombat.com")
            },
            "ozaria": {
                "levels_completed": oz_levels,
                "percent": oz_percent,
                "breakdown": get_course_breakdown("www.ozaria.com")
            },
        }

    def add_skill(self, skill_name):
        from .skill import Skill
        new_skill = Skill(name=skill_name, user_id=self.id)
        db.session.add(new_skill)
        db.session.commit()

    def remove_skill(self, skill_id):
        from .skill import Skill
        skill = db.session.get(Skill, skill_id)
        if skill and skill.user_id == self.id:
            db.session.delete(skill)
            db.session.commit()

    def add_project(self, name, description=None, link=None):
        from .project import Project
        new_project = Project(
            name=name, description=description, link=link, user_id=self.id
        )
        db.session.add(new_project)
        db.session.commit()

    def remove_project(self, project_id):
        from .project import Project
        project = db.session.get(Project, project_id)
        if project and project.user_id == self.id:
            db.session.delete(project)
            db.session.commit()

    def add_ducks(self, amount, reason=None):
        if self.role == "parent":
            return

        if amount > 0:
            self.earned_ducks += amount
            self.packets += amount / (2**14)

        self.duck_balance += amount

        # Record the transaction
        from .duck_transaction import DuckTransaction

        transaction = DuckTransaction(user_id=self.id, amount=amount, reason=reason)
        db.session.add(transaction)
        # Note: The caller must commit the session

    def award_daily_duck(self, amount=1):
        if self.role == "parent":
            return False
            
        today = date.today()
        if self.last_daily_duck != today:
            self.add_ducks(amount, reason="Daily Duck")
            self.last_daily_duck = today
            # Note: The caller must commit the session
            return True
        return False

    def get_contribution_data(self):
        """
        Prepares data for a GitHub-style contribution graph.
        Returns: {
            'months': [{'name': 'Jan', 'colspan': 4}, ...],
            'rows': [[{date, count, level}, ...], ...] # 7 rows (Sun-Sat)
        }
        """
        # Align end date to the coming Saturday to complete the grid
        today = date.today()
        idx = (today.weekday() + 1) % 7  # 0 = Sun
        end_date = today + timedelta(days=(6 - idx))
        start_date = end_date - timedelta(weeks=52)

        from sqlalchemy import func
        from .challenge_log import ChallengeLog

        results = db.session.query(
            func.date(ChallengeLog.timestamp),
            func.count(ChallengeLog.id)
        ).filter(
            ChallengeLog.user_id == self.id,
            ChallengeLog.timestamp >= start_date,
            ChallengeLog.timestamp <= (end_date + timedelta(days=1))
        ).group_by(
            func.date(ChallengeLog.timestamp)
        ).all()

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
        Returns a set of level slugs that the user has completed.
        Used by the skill service to determine Web Dev and other specific course progress.
        """
        # We assume the ChallengeLog model has a 'level_slug' column.
        # Using a set removes duplicates.
        return {getattr(log, "challenge_slug", "") for log in self.challenge_logs}


# SQLAlchemy event listener to auto-generate slug for new users
@event.listens_for(User, "before_insert")
def receive_before_insert(mapper, connection, target):
    """Auto-generate slug before inserting a new user if not already set."""
    if not target.slug:
        target.generate_slug()
