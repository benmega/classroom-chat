from application import db
from application.models.duck_trade import DuckTradeLog
from flask import url_for


def test_submit_trade_valid(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        form_data = {"digital_ducks": 3}
        for i in range(8):
            form_data[f"bit_duck_selection-bit_ducks-{i}"] = 1 if i == 0 else 0
            form_data[f"byte_duck_selection-byte_ducks-{i}"] = 0

        response = client.post(
            url_for("duck_trade.submit_trade"),
            data=form_data,
            follow_redirects=True,
        )
        assert response.status_code == 200

        trade = DuckTradeLog.query.filter_by(
            user_id=sample_user_with_ducks.id, status="pending"
        ).first()
        assert trade is not None
        assert trade.digital_ducks == 3


def test_submit_trade_one_pending_limit(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        existing_trade = DuckTradeLog(
            user_id=sample_user_with_ducks.id,
            digital_ducks=1,
            bit_ducks=[0] * 8,
            byte_ducks=[0] * 8,
            status="pending",
        )
        db.session.add(existing_trade)
        db.session.commit()

        form_data = {"digital_ducks": 3}
        for i in range(8):
            form_data[f"bit_duck_selection-bit_ducks-{i}"] = 0
            form_data[f"byte_duck_selection-byte_ducks-{i}"] = 0

        response = client.post(
            url_for("duck_trade.submit_trade"),
            data=form_data,
            follow_redirects=True,
        )
        assert response.status_code == 200
        assert b"You already have a pending trade" in response.data

        trade_count = DuckTradeLog.query.filter_by(
            user_id=sample_user_with_ducks.id
        ).count()
        assert trade_count == 1


def test_bit_shift_get(client, test_app):
    with test_app.app_context():
        response = client.get(
            url_for("duck_trade.bit_shift"), headers={"Accept": "application/json"}
        )
        assert response.status_code == 200
        assert b"Bit Shift interface has migrated to React" in response.data

        response = client.get(url_for("duck_trade.bit_shift"))
        assert response.status_code == 302
        assert response.headers["Location"] == "/trade"


# New tests for coverage
def test_duck_trade_index(client):
    response = client.get("/duck_trade/")
    assert response.status_code == 302
    assert response.headers["Location"] == "/trade"

    response = client.get("/duck_trade/", headers={"Accept": "application/json"})
    assert response.status_code == 200
    assert b"Duck trade endpoint" in response.data


def test_submit_trade_not_logged_in(client):
    response = client.post(
        "/duck_trade/submit_trade", data={"digital_ducks": 1}, follow_redirects=True
    )
    assert response.status_code == 200
    assert b"You must be logged in" in response.data

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": 1},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 403


def test_submit_trade_user_not_found(client, test_app):
    with client.session_transaction() as sess:
        sess["user"] = 9999

    response = client.post(
        "/duck_trade/submit_trade", data={"digital_ducks": 1}, follow_redirects=True
    )
    assert b"User profile not found" in response.data

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": 1},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 401


def test_submit_trade_invalid_ajax_json(client, sample_user_with_ducks, test_app):
    with client.session_transaction() as sess:
        sess["user"] = sample_user_with_ducks.id

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": 0},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "Must trade at least 1 duck."

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": "abc"},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid duck count."


def test_submit_trade_ajax_success(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        response = client.post(
            "/duck_trade/submit_trade",
            json={"digital_ducks": 2, "bit_ducks": [1, 0], "byte_ducks": []},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert response.status_code == 200
        assert response.get_json()["status"] == "success"


def test_submit_trade_invalid_form(client, sample_user_with_ducks, test_app):
    with client.session_transaction() as sess:
        sess["user"] = sample_user_with_ducks.id

    response = client.post("/duck_trade/submit_trade", data={}, follow_redirects=True)
    assert b"Error: Check your inputs" in response.data

    response = client.post(
        "/duck_trade/submit_trade",
        data={},
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert response.status_code == 400


def test_submit_trade_exception_handling(
    client, sample_user_with_ducks, test_app, monkeypatch
):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        def mock_commit(*args, **kwargs):
            raise Exception("DB Error")

        monkeypatch.setattr(db.session, "commit", mock_commit)

        response = client.post(
            "/duck_trade/submit_trade",
            json={"digital_ducks": 2},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert response.status_code == 500

        form_data = {"digital_ducks": 3}
        for i in range(8):
            form_data[f"bit_duck_selection-bit_ducks-{i}"] = 0
            form_data[f"byte_duck_selection-byte_ducks-{i}"] = 0

        response = client.post(
            "/duck_trade/submit_trade", data=form_data, follow_redirects=True
        )
        assert response.status_code == 200
        assert b"An unexpected error occurred" in response.data


def test_submit_trade_existing_trade_ajax(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()

        with client.session_transaction() as sess:
            sess["user"] = sample_user_with_ducks.id

        existing_trade = DuckTradeLog(
            user_id=sample_user_with_ducks.id,
            digital_ducks=1,
            bit_ducks=[0] * 8,
            byte_ducks=[0] * 8,
            status="pending",
        )
        db.session.add(existing_trade)
        db.session.commit()

        response = client.post(
            "/duck_trade/submit_trade",
            json={"digital_ducks": 2},
            headers={"X-Requested-With": "XMLHttpRequest"},
        )
        assert response.status_code == 400
        assert (
            response.get_json()["message"]
            == "You already have a pending trade. Please wait for it to be processed."
        )


def test_to_binary(test_app):
    from application.routes.duck_trade_routes import to_binary

    assert to_binary({"test": 2}) == {"test": "10"}
