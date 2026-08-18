from datetime import datetime, timedelta

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.classroom import Classroom
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.duck_transaction import DuckTransaction
from application.models.user import User
from flask import Response, current_app, request
from sqlalchemy import func

from ..admin_routes import admin_bp


@admin_bp.route("/dashboard", methods=["GET"])
@admin_only
@api_response
def dashboard_data():
    total_ducks = db.session.query(func.sum(User.duck_balance)).scalar() or 0
    active_users = User.query.filter_by(is_online=True).count()
    pending_trades = DuckTradeLog.query.filter_by(status="pending").count()
    pending_users = User.query.filter_by(is_approved=False).filter(User.role != 'admin').count()

    last_week = datetime.utcnow() - timedelta(days=7)
    ducks_earned_week = (
        db.session.query(func.sum(DuckTransaction.amount))
        .filter(DuckTransaction.amount > 0, DuckTransaction.timestamp >= last_week)
        .scalar()
        or 0
    )

    total_users_count = User.query.count()
    users = User.query.limit(10).all()
    # Column-only projection: avoids loading full ORM objects (and lazy relationship
    # triggers) just to produce the slim per-user list below. Unlike `users` above,
    # this is NOT capped, so it's safe to use for roster-wide stats (counts,
    # averages, breakdowns) without the cost of to_dict_summary() per user.
    all_users = db.session.query(
        User.id, User._username, User.nickname, User.duck_balance, User.role, User.is_online
    ).all()
    config = Configuration.query.first()
    banned_words = BannedWords.query.all()
    classrooms = Classroom.query.all()

    days_param = request.args.get("days", "7")
    tz_offset = request.args.get("tz_offset", 0, type=int)
    now_utc = datetime.utcnow()
    now_local = now_utc - timedelta(minutes=tz_offset)

    first_tx = DuckTransaction.query.order_by(DuckTransaction.timestamp.asc()).first()
    max_history_days = 0
    if first_tx and first_tx.timestamp:
        first_tx_local = first_tx.timestamp - timedelta(minutes=tz_offset)
        max_history_days = (now_local.date() - first_tx_local.date()).days + 1

    if days_param == "all":
        days = max_history_days if max_history_days > 0 else 7
    else:
        try:
            days = int(days_param)
        except ValueError:
            days = 7

    # Generate chart data based on local midnight boundaries
    local_chart_start = (now_local - timedelta(days=days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    chart_start_utc = local_chart_start + timedelta(minutes=tz_offset)

    results = (
        db.session.query(DuckTransaction.timestamp, DuckTransaction.amount)
        .filter(DuckTransaction.timestamp >= chart_start_utc)
        .all()
    )

    stats_map = {}
    for tx in results:
        local_time = tx.timestamp - timedelta(minutes=tz_offset)
        date_str = str(local_time.date())

        if date_str not in stats_map:
            stats_map[date_str] = {"earned": 0, "spent": 0}

        if tx.amount > 0:
            stats_map[date_str]["earned"] += tx.amount
        else:
            stats_map[date_str]["spent"] += tx.amount

    labels = []
    dates = []
    earned = []
    spent = []
    for i in range(days - 1, -1, -1):
        day = (now_local - timedelta(days=i)).date()
        labels.append(day.strftime("%b %d"))
        dates.append(str(day))

        e = stats_map.get(str(day), {}).get("earned", 0)
        s = stats_map.get(str(day), {}).get("spent", 0)
        earned.append(float(e))
        spent.append(abs(float(s)))

    return {
        "total_ducks": total_ducks,
        "active_users_count": active_users,
        "pending_trades_count": pending_trades,
        "pending_users_count": pending_users,
        "ducks_earned_this_week": ducks_earned_week,
        "total_users_count": total_users_count,
        "users": [u.to_dict_summary() for u in users],
        "all_users": [
            {
                "id": u.id,
                "username": u._username,
                "nickname": u.nickname,
                "duck_balance": u.duck_balance,
                "role": u.role,
                "is_online": u.is_online,
            }
            for u in all_users
        ],
        "classrooms": [c.to_dict() for c in classrooms],
        "config": config.to_dict() if config else {},
        "banned_words": [bw.to_dict() for bw in banned_words],
        "chart_data": {
            "labels": labels,
            "dates": dates,
            "earned": earned,
            "spent": spent,
            "max_history_days": max_history_days,
        },
    }


@admin_bp.route("/stats", methods=["GET"])
@admin_only
@api_response
def admin_stats():
    user_count = User.query.count()
    total_ducks = db.session.query(func.sum(User.duck_balance)).scalar() or 0
    pending_approvals = User.query.filter_by(is_approved=False).count()

    return {
        "user_count": user_count,
        "total_ducks": total_ducks,
        "pending_approvals": pending_approvals,
        "timestamp": datetime.utcnow().isoformat(),
    }


@admin_bp.route("/logs", methods=["GET"])
@admin_only
@api_response
def get_logs():
    """Returns the last 500 lines of the application log file."""
    import os

    log_path = os.path.join(current_app.config.get("INSTANCE_FOLDER"), "app.log")

    if not os.path.exists(log_path):
        return {"logs": "Log file not found."}

    try:
        with open(log_path, "r") as f:
            # Read all lines and take last 500
            lines = f.readlines()
            last_lines = lines[-500:]
            return {"logs": "".join(last_lines)}
    except Exception as e:
        return {"error": f"Failed to read logs: {e!s}"}, 500


@admin_bp.route("/export/transactions", methods=["GET"])
@admin_only
def export_transactions():
    """Generates and serves a CSV file of all duck transactions."""
    import csv
    import io

    from flask import stream_with_context
    from sqlalchemy.orm import joinedload

    def generate():
        data = io.StringIO()
        writer = csv.writer(data)

        # Header
        writer.writerow(["ID", "User", "Amount", "Reason", "Timestamp"])
        yield data.getvalue()
        data.seek(0)
        data.truncate(0)

        # Fix N+1 and OOM by using joinedload and yield_per
        transactions = (
            DuckTransaction.query.options(joinedload(DuckTransaction.user))
            .order_by(DuckTransaction.timestamp.desc())
            .yield_per(100)
        )

        for tx in transactions:
            writer.writerow(
                [
                    tx.id,
                    tx.user.username if tx.user else "System",
                    tx.amount,
                    tx.reason,
                    tx.timestamp.isoformat() if tx.timestamp else "",
                ]
            )
            yield data.getvalue()
            data.seek(0)
            data.truncate(0)

    response = Response(stream_with_context(generate()), mimetype="text/csv")
    response.headers.set(
        "Content-Disposition",
        "attachment",
        filename=f"duck_transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
    )
    return response


@admin_bp.route("/transactions", methods=["GET"])
@admin_only
@api_response
def admin_transactions():
    from sqlalchemy.orm import joinedload

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    tx_type = request.args.get("type", "all", type=str)
    search_query = request.args.get("search", "", type=str)
    date_param = request.args.get("date", "", type=str)
    tz_offset = request.args.get("tz_offset", 0, type=int)

    query = DuckTransaction.query.options(joinedload(DuckTransaction.user))

    if tx_type == "earned":
        query = query.filter(DuckTransaction.amount > 0)
    elif tx_type == "spent":
        query = query.filter(DuckTransaction.amount < 0)

    if date_param:
        try:
            day = datetime.strptime(date_param, "%Y-%m-%d").date()
            local_start = datetime(day.year, day.month, day.day)
            local_end = local_start + timedelta(days=1)
            utc_start = local_start + timedelta(minutes=tz_offset)
            utc_end = local_end + timedelta(minutes=tz_offset)
            query = query.filter(
                DuckTransaction.timestamp >= utc_start,
                DuckTransaction.timestamp < utc_end,
            )
        except ValueError:
            pass

    if search_query:
        query = query.join(User).filter(
            db.or_(
                User._username.ilike(f"%{search_query}%"),
                User.nickname.ilike(f"%{search_query}%"),
                DuckTransaction.reason.ilike(f"%{search_query}%"),
            )
        )

    # Order by timestamp descending
    query = query.order_by(DuckTransaction.timestamp.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    transactions = []
    for tx in pagination.items:
        tx_dict = tx.to_dict()
        tx_dict["username"] = tx.user.username if tx.user else "System"
        tx_dict["nickname"] = tx.user.nickname if tx.user else ""
        transactions.append(tx_dict)

    return {
        "transactions": transactions,
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
        "per_page": per_page,
        "date": date_param,
    }


@admin_bp.route("/review_counts", methods=["GET"])
@admin_only
@api_response
def get_review_counts():
    from application.models.course_instance_request import CourseInstanceRequest
    from application.models.project import Project
    from application.models.submission import Submission
    from application.models.track_requests import TrackChangeRequest
    from application.models.user_certificate import UserCertificate

    pending_users = User.query.filter_by(is_approved=False).filter(User.role != 'admin').count()
    pending_trades = DuckTradeLog.query.filter_by(status="pending").count()
    pending_projects = Project.query.filter(
        Project.teacher_comment.is_(None) | (Project.teacher_comment == "")
    ).count()
    pending_certificates = UserCertificate.query.filter_by(status="pending").count()
    pending_track_requests = TrackChangeRequest.query.filter_by(
        status="pending"
    ).count()
    pending_course_requests = CourseInstanceRequest.query.filter_by(
        status="pending"
    ).count()
    pending_submissions = Submission.query.filter_by(status="pending").count()

    total_incomplete = (
        pending_users
        + pending_trades
        + pending_projects
        + pending_certificates
        + pending_track_requests
        + pending_course_requests
        + pending_submissions
    )

    return {
        "pending_users": pending_users,
        "pending_trades": pending_trades,
        "pending_projects": pending_projects,
        "pending_certificates": pending_certificates,
        "pending_track_requests": pending_track_requests,
        "pending_course_requests": pending_course_requests,
        "pending_submissions": pending_submissions,
        "total_incomplete": total_incomplete,
    }
