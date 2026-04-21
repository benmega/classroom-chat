from datetime import datetime, timedelta
from flask import Blueprint, jsonify, Response
from sqlalchemy import func, case
from application.extensions import db
from application.models.user import User
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.banned_words import BannedWords
from application.models.duck_transaction import DuckTransaction
from application.decorators.api_response import api_response
from application.decorators.admin_required import admin_only
from flask import Blueprint, jsonify, current_app
from flask_admin.contrib.sqla import ModelView

from ..admin_routes import admin


@admin.route("/dashboard", methods=["GET"])
@admin_only
@api_response
def dashboard_data():
    total_ducks = db.session.query(func.sum(User.duck_balance)).scalar() or 0
    active_users = User.query.filter_by(is_online=True).count()
    pending_trades = DuckTradeLog.query.filter_by(status="pending").count()
    pending_users = User.query.filter_by(is_approved=False, is_admin=False).count()
    
    last_week = datetime.utcnow() - timedelta(days=7)
    ducks_earned_week = db.session.query(func.sum(DuckTransaction.amount))\
        .filter(DuckTransaction.amount > 0, DuckTransaction.timestamp >= last_week).scalar() or 0
        
    total_users_count = User.query.count()
    users = User.query.limit(10).all()
    config = Configuration.query.first()
    banned_words = BannedWords.query.all()

    # Generate chart data
    now = datetime.utcnow()
    chart_start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    results = db.session.query(
        func.date(DuckTransaction.timestamp).label('date'),
        func.sum(case((DuckTransaction.amount > 0, DuckTransaction.amount), else_=0)).label('earned'),
        func.sum(case((DuckTransaction.amount < 0, DuckTransaction.amount), else_=0)).label('spent')
    ).filter(DuckTransaction.timestamp >= chart_start).group_by(func.date(DuckTransaction.timestamp)).all()

    # Create a lookup for the results
    stats_map = {str(r.date): (r.earned or 0, r.spent or 0) for r in results}
    
    labels = []
    earned = []
    spent = []
    for i in range(6, -1, -1):
        day = (now - timedelta(days=i)).date()
        labels.append(day.strftime("%b %d"))
        
        e, s = stats_map.get(str(day), (0, 0))
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
        "config": config.to_dict() if config else {},
        "banned_words": [bw.to_dict() for bw in banned_words],
        "chart_data": {
            "labels": labels,
            "earned": earned,
            "spent": spent
        }
    }

@admin.route("/stats", methods=["GET"])
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
        "timestamp": datetime.utcnow().isoformat()
    }

@admin.route("/advanced-panel", methods=["GET"])
@admin_only
@api_response
def advanced_panel():
    """
    Returns the list of advanced admin views (Flask-Admin endpoints)
    to be displayed in the React Advanced Panel.
    """
    try:
        # Get the admin instance from app extensions
        admin = current_app.extensions.get('flask_admin_instance')
        
        # Pinned views that we always want at the top (and in this order)
        pinned = {
            "User": "Users",
            "Project": "Projects",
            "Achievement": "Achievements",
            "DuckTradeLog": "Duck Trade Logs",
            "Configuration": "Configuration",
            "BannedWords": "Banned Words",
            "Message": "Messages",
            "Conversation": "Conversations"
        }
        
        views_list = []
        
        if admin:
            # Dynamically get all model views registered with Flask-Admin
            for view in admin._views:
                if isinstance(view, ModelView):
                    model_name = view.model.__name__
                    # Map to pretty name if pinned, otherwise use the view name
                    name = pinned.get(model_name, view.name)
                    views_list.append({
                        "name": name,
                        "endpoint": view.endpoint,
                        "model": model_name
                    })
        else:
            # Fallback to hardcoded list if admin instance is not found
            # (though it should be registered during startup)
            views_list = [
                {"name": name, "endpoint": f"adv_{model_name}"} 
                for model_name, name in pinned.items()
            ]
            
        # Sort views: Pinned first in order, then others alphabetically
        pinned_keys = list(pinned.keys())
        def sort_key(v):
            try:
                # If it's a model in pinned list, use its index
                return (0, pinned_keys.index(v.get('model', '')))
            except ValueError:
                # Otherwise, alphabetical at the bottom
                return (1, v['name'])
                
        views_list.sort(key=sort_key)

        return {
            "views": views_list
        }
    except Exception as e:
        # Log error and return empty list rather than 500
        print(f"Error in advanced_panel: {str(e)}")
        return {"views": [], "error": str(e)}, 500

@admin.route("/logs", methods=["GET"])
@admin_only
@api_response
def get_logs():
    """Returns the last 500 lines of the application log file."""
    import os
    log_path = os.path.join(current_app.config.get("INSTANCE_FOLDER"), "app.log")
    
    if not os.path.exists(log_path):
        return {"logs": "Log file not found."}
        
    try:
        with open(log_path, 'r') as f:
            # Read all lines and take last 500
            lines = f.readlines()
            last_lines = lines[-500:]
            return {"logs": "".join(last_lines)}
    except Exception as e:
        return {"error": f"Failed to read logs: {str(e)}"}, 500
@admin.route("/export/transactions", methods=["GET"])
@admin_only
def export_transactions():
    """Generates and serves a CSV file of all duck transactions."""
    import csv
    import io
    
    transactions = DuckTransaction.query.order_by(DuckTransaction.timestamp.desc()).all()
    
    def generate():
        data = io.StringIO()
        writer = csv.writer(data)
        
        # Header
        writer.writerow(['ID', 'User', 'Amount', 'Reason', 'Timestamp'])
        yield data.getvalue()
        data.seek(0)
        data.truncate(0)
        
        for tx in transactions:
            writer.writerow([
                tx.id,
                tx.user.username if tx.user else 'System',
                tx.amount,
                tx.reason,
                tx.timestamp.isoformat() if tx.timestamp else ''
            ])
            yield data.getvalue()
            data.seek(0)
            data.truncate(0)
            
    response = Response(generate(), mimetype='text/csv')
    response.headers.set("Content-Disposition", "attachment", filename=f"duck_transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
    return response
