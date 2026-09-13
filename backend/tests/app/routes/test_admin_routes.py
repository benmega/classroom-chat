"""
File: test_admin_routes.py
Type: py
Summary: Unit tests for admin routes Flask routes.
"""

import contextlib
import json
from unittest.mock import patch

from application.extensions import db
from application.models.banned_words import BannedWords
from application.models.configuration import Configuration
from application.models.duck_trade import DuckTradeLog
from application.models.user import User
from flask import url_for


def login_as_admin(client, admin_user):
    """Helper to simulate an admin login via session."""
    with client.session_transaction() as sess:
        # Flask-Login requires the user ID to be a string
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True

        # Custom admin_only decorator expects 'user' key.
        # We store it as-is (likely int) to ensure User.query.get() works.
        sess["user"] = admin_user.id


def test_get_users_requires_auth(client, sample_user):
    """Test that the users endpoint requires authentication."""
    client.delete_cookie("session")

    response = client.get("/api/admin/users", headers={"Accept": "application/json"})
    assert response.status_code == 401


def test_get_users_with_auth(client, sample_admin, sample_users):
    """Test that the users endpoint returns users when authenticated."""
    login_as_admin(client, sample_admin)

    response = client.get("/api/admin/users")
    assert response.status_code == 200

    data = json.loads(response.data)
    user_list = data.get("users", data)
    assert len(user_list) >= 2  # At least the sample users we created

    usernames = [user["username"] for user in user_list]
    for user in sample_users:
        assert user.username in usernames


def test_set_username_route(client, sample_user, sample_admin):
    """Test setting a username as an admin."""
    login_as_admin(client, sample_admin)

    resp = client.post(
        "/api/admin/set_username",
        data={"user_id": sample_user.id, "username": "new_username"},
    )
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True

    # Query inside a context
    with client.application.app_context():
        updated = db.session.get(User, sample_user.id)
        assert updated.username == "new_username"


def test_verify_password_success(client, test_app, sample_admin):
    """Test successful password verification."""
    from application.config import TestingConfig

    login_as_admin(client, sample_admin)

    with patch(
        "application.routes.admin_routes.admin_pass",
        TestingConfig.ADMIN_PASSWORD,
    ):
        # We MUST provide user_id, otherwise the backend tries to find user by IP (127.0.0.1)
        # which fails in testing, causing the AttributeError seen in logs.
        response = client.post(
            "/api/admin/verify_password",
            data={
                "password": TestingConfig.ADMIN_PASSWORD,
                "username": "verified_username",
                "user_id": sample_admin.id,
            },
        )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True

    with test_app.app_context():
        updated_user = db.session.get(User, sample_admin.id)
        assert updated_user.username == "verified_username"


def test_verify_password_failure(client, sample_admin):
    """Test failed password verification."""
    login_as_admin(client, sample_admin)

    response = client.post(
        "/api/admin/verify_password",
        data={
            "password": "wrong_password",
            "username": "any_username",
            "user_id": sample_admin.id,
        },
    )

    assert response.status_code == 401
    data = json.loads(response.data)
    assert data["success"] is False


def test_dashboard(client, sample_admin, sample_configuration):
    """Test accessing the admin dashboard."""
    login_as_admin(client, sample_admin)

    response = client.get("/api/admin/dashboard")
    assert response.status_code == 200


def test_toggle_ai(client, test_app, sample_configuration, sample_admin):
    """Test toggling AI teacher functionality."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_state = sample_configuration.ai_teacher_enabled

        response = client.post("/api/admin/toggle-ai")
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_config = Configuration.query.first()
        assert updated_config.ai_teacher_enabled != initial_state


def test_toggle_message_sending(client, test_app, sample_configuration, sample_admin):
    """Test toggling message sending functionality."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_state = sample_configuration.message_sending_enabled

        response = client.post("/api/admin/toggle-message-sending")
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_config = Configuration.query.first()
        assert updated_config.message_sending_enabled != initial_state


def test_clear_partial_history(client, test_app, init_db, sample_admin):
    """Test clearing partial conversation history."""
    login_as_admin(client, sample_admin)



def test_add_banned_word(client, sample_admin, test_app):
    """Test adding a banned word."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        response = client.post(
            "/api/admin/add-banned-word",
            data={"word": "testbadword", "reason": "testing purposes"},
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        banned_word = BannedWords.query.filter_by(word="testbadword").first()
        assert banned_word is not None
        assert banned_word.reason == "testing purposes"

        response = client.post(
            "/api/admin/add-banned-word", data={"word": "testbadword"}
        )
        assert response.status_code == 400

        db.session.delete(banned_word)
        db.session.commit()


def test_strike_message(client, sample_admin, sample_message):
    """Test striking a message."""
    login_as_admin(client, sample_admin)



def test_adjust_ducks(client, sample_admin, sample_user, test_app):
    """Test adjusting a user's duck balance."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_ducks = sample_user.duck_balance

        response = client.post(
            "/api/admin/adjust_ducks",
            data={"username": sample_user.username, "amount": 50},
        )
        data = json.loads(response.data)

        assert response.status_code == 200
        assert data["success"] is True

        updated_user = db.session.get(User, sample_user.id)
        assert updated_user.duck_balance == initial_ducks + 50


def test_trade_action_approve(
    client, sample_admin, sample_user, sample_duck_trade, test_app, init_db
):
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        sample_user.duck_balance = 100
        db.session.commit()

        trade_id = sample_duck_trade.id

        with patch.object(DuckTradeLog, "approve") as mock_approve:
            response = client.post(
                "/api/admin/trade_action",
                data={"trade_id": str(trade_id), "action": "approve"},
                content_type="application/x-www-form-urlencoded",
            )

            data = json.loads(response.data)
            assert response.status_code == 200
            assert data["status"] == "success"
            mock_approve.assert_called_once()


def test_trade_action_reject(client, sample_admin, sample_duck_trade, init_db):
    """Test rejecting a duck trade."""
    login_as_admin(client, sample_admin)

    with patch.object(DuckTradeLog, "reject") as mock_reject:
        response = client.post(
            "/api/admin/trade_action",
            data={"trade_id": sample_duck_trade.id, "action": "reject"},
        )

        data = json.loads(response.data)
        assert response.status_code == 200
        assert data["status"] == "success"
        mock_reject.assert_called_once()


def test_reset_password(client, sample_admin, sample_user, test_app, init_db):
    """Test resetting a user's password."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        with patch.object(User, "set_password") as mock_set_password:
            response = client.post(
                "/api/admin/reset_password",
                json={"username": sample_user.username, "new_password": "newpassword"},
            )
            data = json.loads(response.data)

            assert response.status_code == 200
            assert data["success"] is True
            mock_set_password.assert_called_once_with("newpassword")

        response = client.post(
            "/api/admin/reset_password",
            json={"username": "nonexistent_user", "new_password": "newpassword"},
        )
        assert response.status_code == 404


def test_admin_transactions(client, test_app, sample_admin, sample_user):
    """Test retrieving, filtering, and searching admin transactions."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        from application.models.duck_transaction import DuckTransaction

        # Clear existing transactions if any to start fresh
        DuckTransaction.query.delete()

        tx1 = DuckTransaction(
            user_id=sample_user.id, amount=10.0, reason="Earned daily bonus"
        )
        tx2 = DuckTransaction(
            user_id=sample_user.id, amount=-5.0, reason="Spent on emoji pack"
        )
        db.session.add_all([tx1, tx2])
        db.session.commit()

        response = client.get("/api/admin/transactions")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["status"] == "success"
        txs = data["data"]["transactions"]
        assert len(txs) == 2

        response = client.get("/api/admin/transactions?type=earned")
        assert response.status_code == 200
        data = json.loads(response.data)
        txs = data["data"]["transactions"]
        assert len(txs) == 1
        assert all(t["amount"] > 0 for t in txs)

        response = client.get("/api/admin/transactions?type=spent")
        assert response.status_code == 200
        data = json.loads(response.data)
        txs = data["data"]["transactions"]
        assert len(txs) == 1
        assert all(t["amount"] < 0 for t in txs)

        response = client.get("/api/admin/transactions?search=emoji")
        assert response.status_code == 200
        data = json.loads(response.data)
        txs = data["data"]["transactions"]
        assert len(txs) == 1
        assert txs[0]["reason"] == "Spent on emoji pack"


def test_get_users(client, test_app, sample_users, sample_admin, init_db):
    """Test the /users route properly returns user data."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        response = client.get(url_for("admin.get_users"))

        assert response.status_code == 200
        users_data = json.loads(response.data)
        assert len(users_data) >= len(sample_users)

        user_list = users_data.get("users", users_data)
        user_data = next(
            u for u in user_list if u["username"] == sample_users[0].username
        )
        assert user_data["username"] == sample_users[0].username
        assert "levels_today" in user_data


def test_set_username_proper_case_handling(client, test_app, sample_user, sample_admin):
    """Test that usernames are properly converted to lowercase per the User model."""
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        mixed_case_username = "MixedCaseUsername"

        response = client.post(
            url_for("admin.set_username_route"),
            data={"user_id": sample_user.id, "username": mixed_case_username},
        )

        assert response.status_code == 200
        json_response = json.loads(response.data)
        assert json_response["success"] is True

        updated_user = db.session.get(User, sample_user.id)
        assert updated_user.username == mixed_case_username.lower()


def test_admin_transactions_route(client, test_app, sample_user, sample_admin):
    """Test that the /transactions route works, filters correctly, and requires admin."""
    from application.models.duck_transaction import DuckTransaction

    response = client.get("/api/admin/transactions")
    assert response.status_code == 401

    login_as_admin(client, sample_admin)

    with test_app.app_context():
        tx1 = DuckTransaction(user_id=sample_user.id, amount=10.0, reason="Test Earned")
        tx2 = DuckTransaction(user_id=sample_user.id, amount=-5.0, reason="Test Spent")
        db.session.add_all([tx1, tx2])
        db.session.commit()

        resp = client.get("/api/admin/transactions")
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert len(data["transactions"]) >= 2

        resp_earned = client.get("/api/admin/transactions?type=earned")
        assert resp_earned.status_code == 200
        data_earned = resp_earned.get_json()["data"]
        assert all(t["amount"] > 0 for t in data_earned["transactions"])

        resp_spent = client.get("/api/admin/transactions?type=spent")
        assert resp_spent.status_code == 200
        data_spent = resp_spent.get_json()["data"]
        assert all(t["amount"] < 0 for t in data_spent["transactions"])

        # Search filter
        resp_search = client.get("/api/admin/transactions?search=Earned")
        assert resp_search.status_code == 200
        data_search = resp_search.get_json()["data"]
        assert len(data_search["transactions"]) > 0
        assert any("Earned" in t["reason"] for t in data_search["transactions"])


def test_adjust_packets(client, sample_admin, sample_user, test_app):
    """Test adjusting a user's packets."""
    client.delete_cookie("session")
    resp_unauth = client.post(
        "/api/admin/adjust_packets",
        data={"username": sample_user.username, "amount": 10},
    )
    assert resp_unauth.status_code == 401

    # Login as admin
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        initial_packets = sample_user.packets

        resp_positive = client.post(
            "/api/admin/adjust_packets",
            data={"username": sample_user.username, "amount": 10},
        )
        data_pos = json.loads(resp_positive.data)
        assert resp_positive.status_code == 200
        assert data_pos["success"] is True

        updated_user = db.session.get(User, sample_user.id)
        assert updated_user.packets == initial_packets + 10

        resp_negative = client.post(
            "/api/admin/adjust_packets",
            data={"username": sample_user.username, "amount": -5},
        )
        data_neg = json.loads(resp_negative.data)
        assert resp_negative.status_code == 200
        assert data_neg["success"] is True

        updated_user_neg = db.session.get(User, sample_user.id)
        assert updated_user_neg.packets == initial_packets + 5

        resp_missing = client.post("/api/admin/adjust_packets", data={"amount": 10})
        assert resp_missing.status_code == 400

        resp_missing2 = client.post(
            "/api/admin/adjust_packets", data={"username": sample_user.username}
        )
        assert resp_missing2.status_code == 400

        resp_not_found = client.post(
            "/api/admin/adjust_packets",
            data={"username": "nonexistent_user", "amount": 10},
        )
        assert resp_not_found.status_code == 404


def test_project_template_crud_admin(client, sample_admin, test_app):
    """Test CRUD operations on ProjectTemplate resource as an admin."""
    from application.models.project_template import ProjectTemplate

    client.delete_cookie("session")
    resp = client.get("/api/project-templates", headers={"Accept": "application/json"})
    assert resp.status_code == 401

    login_as_admin(client, sample_admin)

    with test_app.app_context():
        resp = client.get("/api/project-templates")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "data" in data
        assert "templates" in data["data"]
        templates_map = data["data"]["templates"]
        assert len(templates_map) >= 5

        payload = {
            "name": "New Custom Test Template",
            "description": "Test description for new custom template.",
        }
        resp_create = client.post("/api/project-templates", json=payload)
        assert resp_create.status_code == 200
        new_template = resp_create.get_json()["data"]["template"]
        assert new_template["name"] == "New Custom Test Template"
        new_id = new_template["id"]

        update_payload = {"description": "Updated custom description."}
        resp_update = client.put(
            f"/api/project-templates/{new_id}", json=update_payload
        )
        assert resp_update.status_code == 200
        assert (
            resp_update.get_json()["data"]["template"]["description"]
            == "Updated custom description."
        )

        resp_delete = client.delete(f"/api/project-templates/{new_id}")
        assert resp_delete.status_code == 200

        assert db.session.get(ProjectTemplate, new_id) is None


def test_project_review_packets(client, sample_admin, sample_user, test_app):
    """Test project review packet rewards and retraction."""
    from application.models.project import Project

    # Login as admin
    login_as_admin(client, sample_admin)

    with test_app.app_context():
        project = Project(
            name="Test Project",
            description="A test project description",
            user_id=sample_user.id,
        )
        db.session.add(project)
        db.session.commit()
        project_id = project.id

        initial_packets = sample_user.packets
        assert project.packets_awarded == 0.0

        resp_approve = client.post(
            f"/api/admin/handle-project-review/{project_id}",
            json={
                "action": "approve",
                "teacher_comment": "Excellent work!",
                "packet_reward": 0.015,
            },
        )
        assert resp_approve.status_code == 200
        data_approve = resp_approve.get_json()
        assert data_approve["status"] == "success"

        db.session.expire_all()
        updated_project = db.session.get(Project, project_id)
        updated_user = db.session.get(User, sample_user.id)
        assert updated_project.teacher_comment == "Excellent work!"
        assert updated_project.packets_awarded == 0.015
        assert updated_user.packets == initial_packets + 0.015

        resp_reapprove = client.post(
            f"/api/admin/handle-project-review/{project_id}",
            json={
                "action": "approve",
                "teacher_comment": "Updated feedback",
                "packet_reward": 0.025,
            },
        )
        assert resp_reapprove.status_code == 200

        db.session.expire_all()
        updated_project2 = db.session.get(Project, project_id)
        updated_user2 = db.session.get(User, sample_user.id)
        assert updated_project2.teacher_comment == "Updated feedback"
        assert updated_project2.packets_awarded == 0.025
        assert updated_user2.packets == initial_packets + 0.025

        resp_reject = client.post(
            f"/api/admin/handle-project-review/{project_id}", json={"action": "reject"}
        )
        assert resp_reject.status_code == 200

        db.session.expire_all()
        updated_project3 = db.session.get(Project, project_id)
        updated_user3 = db.session.get(User, sample_user.id)
        assert updated_project3.teacher_comment is None
        assert updated_project3.packets_awarded == 0.0
        assert updated_user3.packets == initial_packets


def test_parent_child_endpoints(client, test_app, sample_admin):
    """Test the admin parent-student connection retrieval and listing endpoints."""
    from application.models.user import User

    login_as_admin(client, sample_admin)

    with client.application.app_context():
        parent = User(username="testparent", role="parent", password_hash="test")
        student = User(username="teststudent", role="student", password_hash="test")
        db.session.add(parent)
        db.session.add(student)
        db.session.commit()
        parent_id = parent.id
        student_id = student.id

    link_resp = client.post(f"/api/admin/parents/{parent_id}/link/{student_id}")
    assert link_resp.status_code == 200
    assert link_resp.get_json()["success"] is True

    parents_resp = client.get(f"/api/admin/students/{student_id}/parents")
    assert parents_resp.status_code == 200
    p_data = parents_resp.get_json()
    assert p_data["success"] is True
    assert len(p_data["parents"]) == 1
    assert p_data["parents"][0]["username"] == "testparent"

    conn_resp = client.get("/api/admin/parents/connections")
    assert conn_resp.status_code == 200
    c_data = conn_resp.get_json()
    assert c_data["success"] is True
    found = False
    for conn in c_data["connections"]:
        if conn["parent"]["id"] == parent_id and conn["student"]["id"] == student_id:
            found = True
            break
    assert found is True

    unlink_resp = client.post(f"/api/admin/parents/{parent_id}/unlink/{student_id}")
    assert unlink_resp.status_code == 200
    assert unlink_resp.get_json()["success"] is True

    parents_resp2 = client.get(f"/api/admin/students/{student_id}/parents")
    assert parents_resp2.status_code == 200
    assert len(parents_resp2.get_json()["parents"]) == 0


def test_reject_user(client, test_app, sample_admin):
    """Test that rejecting/deleting a user cascades and deletes all related transactions, messages, and connection attempts."""
    from application.models.connection_attempt import ConnectionAttempt
    from application.models.duck_transaction import DuckTransaction
    from application.models.message import Message
    from application.models.user import User

    login_as_admin(client, sample_admin)

    with client.application.app_context():
        user = User(username="rejectme", password_hash="testpass")
        db.session.add(user)
        db.session.commit()
        user_id = user.id

        tx = DuckTransaction(user_id=user_id, amount=10.0, reason="Test Reject Cascade")
        db.session.add(tx)

        msg = Message(user_id=user_id, content="Test message by rejected user")
        db.session.add(msg)

        attempt = ConnectionAttempt(
            parent_id=user_id, code_attempted="XYZ123", success=False
        )
        db.session.add(attempt)

        db.session.commit()

    response = client.post(f"/api/admin/reject_user/{user_id}")
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"

    with client.application.app_context():
        assert db.session.get(User, user_id) is None
        assert DuckTransaction.query.filter_by(user_id=user_id).first() is None
        assert Message.query.filter_by(user_id=user_id).first() is None
        assert ConnectionAttempt.query.filter_by(parent_id=user_id).first() is None


def test_dashboard_extended(client, sample_admin, test_app, sample_user):
    """Test dashboard with various parameters for coverage."""
    from application.models.duck_transaction import DuckTransaction

    login_as_admin(client, sample_admin)

    with test_app.app_context():
        tx = DuckTransaction(
            user_id=sample_user.id, amount=15.0, reason="Test Earned Dashboard"
        )
        db.session.add(tx)

        # Spent transaction
        tx2 = DuckTransaction(
            user_id=sample_user.id, amount=-5.0, reason="Test Spent Dashboard"
        )
        db.session.add(tx2)
        db.session.commit()

        resp = client.get("/api/admin/dashboard?days=all&tz_offset=120")
        assert resp.status_code == 200

        resp2 = client.get("/api/admin/dashboard?days=invalid")
        assert resp2.status_code == 200


def test_admin_stats(client, sample_admin, test_app):
    """Test the /stats route."""
    login_as_admin(client, sample_admin)

    resp = client.get("/api/admin/stats")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "user_count" in data["data"]
    assert "total_ducks" in data["data"]


def test_admin_logs(client, sample_admin, test_app):
    """Test the /logs route."""
    import os

    login_as_admin(client, sample_admin)

    log_path = os.path.join(test_app.config.get("INSTANCE_FOLDER"), "app.log")

    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "w") as f:
        f.write("Line 1\nLine 2\n")

    resp = client.get("/api/admin/logs")
    assert resp.status_code == 200
    assert "Line 1" in resp.get_json()["data"]["logs"]
    with contextlib.suppress(PermissionError):
        os.remove(log_path)

    test_app.config["INSTANCE_FOLDER"] = "/tmp/does_not_exist_log_path"
    resp2 = client.get("/api/admin/logs")
    assert resp2.status_code == 200
    assert "Log file not found." in resp2.get_json()["data"]["logs"]


def test_export_transactions(client, sample_admin, test_app, sample_user):
    """Test exporting transactions to CSV."""
    from application.models.duck_transaction import DuckTransaction

    login_as_admin(client, sample_admin)

    with test_app.app_context():
        tx = DuckTransaction(user_id=sample_user.id, amount=20.0, reason="Export Test")
        db.session.add(tx)
        db.session.commit()

    resp = client.get("/api/admin/export/transactions")
    assert resp.status_code == 200
    assert resp.headers["Content-Type"].startswith("text/csv")

    data = resp.data.decode("utf-8")
    assert "ID,User,Amount,Reason,Timestamp" in data
    assert "Export Test" in data


def test_manage_projects(client, sample_admin, sample_user, test_app):
    """Test the /manage-projects endpoint."""
    from application.models.project import Project

    login_as_admin(client, sample_admin)

    with test_app.app_context():
        # Pending project
        p1 = Project(name="Pending P", user_id=sample_user.id)
        # Approved project
        p2 = Project(name="Approved P", user_id=sample_user.id, teacher_comment="Good")
        db.session.add_all([p1, p2])
        db.session.commit()

    resp = client.get("/api/admin/manage-projects?filter=pending")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["pending_count"] >= 1
    assert data["total_count"] >= 2
    assert any(p["name"] == "Pending P" for p in data["projects"])
    assert all(not p.get("teacher_comment") for p in data["projects"])

    resp2 = client.get("/api/admin/manage-projects?filter=all")
    assert resp2.status_code == 200
    assert len(resp2.get_json()["data"]["projects"]) >= 2


def test_handle_project_review_errors(client, sample_admin, sample_user, test_app):
    """Test error handling in handle-project-review."""
    from application.models.project import Project

    login_as_admin(client, sample_admin)

    with test_app.app_context():
        project = Project(name="Test Error P", user_id=sample_user.id)
        db.session.add(project)
        db.session.commit()
        p_id = project.id

    resp = client.post(
        f"/api/admin/handle-project-review/{p_id}", json={"action": "unknown"}
    )
    assert resp.status_code == 400

    resp2 = client.post(
        f"/api/admin/handle-project-review/{p_id}",
        json={"action": "approve", "packet_reward": "invalid_number"},
    )
    assert resp2.status_code == 200  # Defaults to 0.006


def test_assign_project(client, sample_admin, sample_user, test_app):
    """Test assigning a project."""
    from application.models.project import Project

    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/assign-project", json={})
    assert resp.status_code == 400

    # Valid payload
    resp2 = client.post(
        "/api/admin/assign-project",
        json={
            "user_id": sample_user.id,
            "name": "Assigned Project",
            "description": "Desc",
        },
    )
    assert resp2.status_code == 200

    with test_app.app_context():
        p = Project.query.filter_by(name="Assigned Project").first()
        assert p is not None
        assert p.description == "Desc"



def test_review_counts_route(client, sample_admin):
    """Test retrieving review counts as admin."""
    login_as_admin(client, sample_admin)

    resp = client.get("/api/admin/review_counts")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert "pending_users" in data["data"]
    assert "pending_trades" in data["data"]
    assert "pending_projects" in data["data"]
    assert "pending_certificates" in data["data"]
    assert "pending_course_requests" in data["data"]
    assert "total_incomplete" in data["data"]
