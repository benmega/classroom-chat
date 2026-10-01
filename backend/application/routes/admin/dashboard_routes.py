from collections import deque
from datetime import datetime, timedelta

from application.decorators.admin_required import admin_only
from application.decorators.api_response import api_response
from application.extensions import db
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.duck_transaction import DuckTransaction
from application.models.user import User
from application.utilities.helper_functions import utcnow_naive
from flask import Response, current_app, request
from sqlalchemy import and_, case, func

from ..admin_routes import admin_bp

# The longest chart range a caller can ask for by number of days ("all" follows the data)
MAX_CHART_DAYS = 365
# Rows in the "high value earners" list
TOP_EARNERS_COUNT = 5


@admin_bp.route("/dashboard", methods=["GET"])
@admin_only
@api_response
def dashboard_data():
    # Every roster-wide figure comes from one grouped query: no user is loaded
    roster = (
        db.session.query(
            User.role,
            User.is_online,
            func.count(User.id),
            func.sum(User.duck_balance),
            func.sum(
                case((and_(User.is_approved.is_(False), User.role != 'admin'), 1), else_=0)
            ),
        )
        .group_by(User.role, User.is_online)
        .all()
    )
    total_users_count = 0
    active_users = 0
    total_ducks = 0
    pending_users = 0
    user_distribution = {
        "active_students": 0,
        "inactive_students": 0,
        "parents": 0,
        "admins": 0,
    }
    for role, is_online, role_count, role_ducks, role_pending in roster:
        total_users_count += role_count
        total_ducks += role_ducks or 0
        pending_users += int(role_pending or 0)
        if is_online:
            active_users += role_count
        if role == "student":
            user_distribution["active_students" if is_online else "inactive_students"] += role_count
        elif role == "parent":
            user_distribution["parents"] += role_count
        elif role == "admin":
            user_distribution["admins"] += role_count

    top_earners = (
        db.session.query(User.id, User._username, User.nickname, User.duck_balance)
        .order_by(User.duck_balance.desc(), User.id)
        .limit(TOP_EARNERS_COUNT)
        .all()
    )
    pending_trades = DuckTradeLog.query.filter_by(status="pending").count()
    config = Configuration.get_current()

    days_param = request.args.get("days", "7")
    tz_offset = request.args.get("tz_offset", 0, type=int)
    now_utc = utcnow_naive()
    now_local = now_utc - timedelta(minutes=tz_offset)

    # The first transaction and this week's earnings in a single pass over the table
    last_week = now_utc - timedelta(days=7)
    first_tx_time, ducks_earned_week = db.session.query(
        func.min(DuckTransaction.timestamp),
        func.sum(
            case(
                (
                    and_(DuckTransaction.amount > 0, DuckTransaction.timestamp >= last_week),
                    DuckTransaction.amount,
                ),
                else_=0,
            )
        ),
    ).one()
    ducks_earned_week = ducks_earned_week or 0
    max_history_days = 0
    if first_tx_time:
        first_tx_local = first_tx_time - timedelta(minutes=tz_offset)
        max_history_days = (now_local.date() - first_tx_local.date()).days + 1

    if days_param == "all":
        days = max_history_days if max_history_days > 0 else 7
    else:
        try:
            days = max(1, min(int(days_param), MAX_CHART_DAYS))
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
        "user_distribution": user_distribution,
        "top_earners": [
            {
                "id": uid,
                "username": username,
                "nickname": nickname,
                "duck_balance": duck_balance,
            }
            for uid, username, nickname, duck_balance in top_earners
        ],
        "config": config.to_dict() if config else {},
        "chart_data": {
            "labels": labels,
            "dates": dates,
            "earned": earned,
            "spent": spent,
            "max_history_days": max_history_days,
        },
    }


@admin_bp.route("/logs", methods=["GET"])
@admin_only
@api_response
def get_logs():
    """Returns the last 500 lines of the application log file."""
    import os

    log_path = os.path.join(current_app.config["INSTANCE_FOLDER"], "app.log")

    if not os.path.exists(log_path):
        return {"logs": "Log file not found."}

    try:
        # The file can be 10 MB: stream it and keep only the last 500 lines
        with open(log_path, "r", errors="replace") as f:
            last_lines = deque(f, maxlen=500)
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
    from application.models.user_certificate import UserCertificate

    pending_users = User.query.filter_by(is_approved=False).filter(User.role != 'admin').count()
    pending_trades = DuckTradeLog.query.filter_by(status="pending").count()
    pending_projects = Project.query.filter(Project.status == "pending").count()
    pending_certificates = UserCertificate.query.filter_by(status="pending").count()
    pending_course_requests = CourseInstanceRequest.query.filter_by(
        status="pending"
    ).count()
    pending_submissions = Submission.query.filter_by(status="pending").count()

    total_incomplete = (
        pending_users
        + pending_trades
        + pending_projects
        + pending_certificates
        + pending_course_requests
        + pending_submissions
    )

    return {
        "pending_users": pending_users,
        "pending_trades": pending_trades,
        "pending_projects": pending_projects,
        "pending_certificates": pending_certificates,
        "pending_course_requests": pending_course_requests,
        "pending_submissions": pending_submissions,
        "total_incomplete": total_incomplete,
    }
