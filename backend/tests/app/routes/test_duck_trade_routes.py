import pytest
from application import db
from application.models.duck_trade import DuckTradeLog

AJAX = {"X-Requested-With": "XMLHttpRequest"}
PLACES = [0] * 8


def _login(client, user):
    with client.session_transaction() as sess:
        sess["user"] = user.id


def test_submit_trade_valid(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()
        _login(client, sample_user_with_ducks)

        response = client.post(
            "/duck_trade/submit_trade",
            json={
                "digital_ducks": 3,
                "bit_ducks": [1, 1, 0, 0, 0, 0, 0, 0],
                "byte_ducks": PLACES,
            },
            headers=AJAX,
        )

        assert response.status_code == 200
        assert response.get_json()["status"] == "success"

        trade = DuckTradeLog.query.filter_by(
            user_id=sample_user_with_ducks.id, status="pending"
        ).first()
        assert trade is not None
        assert trade.digital_ducks == 3
        # The submitted binary arrays are stored as sent, never replaced by empty lists
        assert trade.bit_ducks == [1, 1, 0, 0, 0, 0, 0, 0]
        assert trade.byte_ducks == PLACES


def test_submit_trade_does_not_need_ajax_header(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()
        _login(client, sample_user_with_ducks)

        response = client.post(
            "/duck_trade/submit_trade",
            json={"digital_ducks": 1, "bit_ducks": PLACES, "byte_ducks": PLACES},
        )

        assert response.status_code == 200
        assert response.get_json()["status"] == "success"


def test_submit_trade_one_pending_limit(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()
        _login(client, sample_user_with_ducks)

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
            json={"digital_ducks": 3, "bit_ducks": PLACES, "byte_ducks": PLACES},
            headers=AJAX,
        )

        assert response.status_code == 400
        assert "You already have a pending trade" in response.get_json()["message"]

        trade_count = DuckTradeLog.query.filter_by(
            user_id=sample_user_with_ducks.id
        ).count()
        assert trade_count == 1


def test_legacy_duck_trade_page_routes_removed(test_app):
    rules = {rule.rule for rule in test_app.url_map.iter_rules()}
    assert "/duck_trade/" not in rules
    assert "/duck_trade/bit_shift" not in rules
    assert "/duck_trade/submit_trade" in rules


def test_submit_trade_not_logged_in(client):
    response = client.post(
        "/duck_trade/submit_trade", json={"digital_ducks": 1}, headers=AJAX
    )
    # 401, not 403: the axios client only clears a logged-out SPA's auth state on 401
    assert response.status_code == 401
    assert response.get_json() == {
        "status": "error",
        "message": "You must be logged in.",
    }


def test_submit_trade_user_not_found(client, test_app):
    with client.session_transaction() as sess:
        sess["user"] = 9999

    response = client.post(
        "/duck_trade/submit_trade", json={"digital_ducks": 1}, headers=AJAX
    )
    assert response.status_code == 401
    assert "User profile not found" in response.get_json()["message"]


def test_submit_trade_invalid_ajax_json(client, sample_user_with_ducks, test_app):
    _login(client, sample_user_with_ducks)

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": 0},
        headers=AJAX,
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "Must trade at least 1 duck."

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": "abc"},
        headers=AJAX,
    )
    assert response.status_code == 400
    assert response.get_json()["message"] == "Invalid duck count."


@pytest.mark.parametrize("count", [-1, -3, "-5", -(10**6)])
def test_submit_trade_rejects_a_negative_count(client, sample_user_with_ducks, count):
    _login(client, sample_user_with_ducks)

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": count, "bit_ducks": PLACES, "byte_ducks": PLACES},
        headers=AJAX,
    )

    assert response.status_code == 400
    assert response.get_json() == {"status": "error", "message": "Must trade at least 1 duck."}
    assert DuckTradeLog.query.count() == 0


@pytest.mark.parametrize("count", [None, [], {}, "", "ten", "1e3"])
def test_submit_trade_rejects_a_count_that_is_not_a_number(client, sample_user_with_ducks, count):
    _login(client, sample_user_with_ducks)

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": count, "bit_ducks": PLACES, "byte_ducks": PLACES},
        headers=AJAX,
    )

    assert response.status_code == 400
    assert response.get_json() == {"status": "error", "message": "Invalid duck count."}
    assert DuckTradeLog.query.count() == 0


def test_submit_trade_without_a_count_is_refused(client, sample_user_with_ducks):
    _login(client, sample_user_with_ducks)

    response = client.post(
        "/duck_trade/submit_trade",
        json={"bit_ducks": PLACES, "byte_ducks": PLACES},
        headers=AJAX,
    )

    assert response.status_code == 400
    assert response.get_json()["message"] == "Must trade at least 1 duck."
    assert DuckTradeLog.query.count() == 0


def test_submit_trade_for_the_whole_balance_is_accepted(client, sample_user_with_ducks):
    """The balance is the ceiling, not an exclusive limit: trading every duck is fine."""
    _login(client, sample_user_with_ducks)
    balance = sample_user_with_ducks.duck_balance

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": balance, "bit_ducks": PLACES, "byte_ducks": PLACES},
        headers=AJAX,
    )

    assert response.status_code == 200
    assert DuckTradeLog.query.one().digital_ducks == balance


def test_submit_trade_does_not_touch_the_balance_until_approval(client, sample_user_with_ducks):
    from application.models.duck_transaction import DuckTransaction

    _login(client, sample_user_with_ducks)
    balance = sample_user_with_ducks.duck_balance

    client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": 5, "bit_ducks": PLACES, "byte_ducks": PLACES},
        headers=AJAX,
    )

    db.session.expire_all()
    assert sample_user_with_ducks.duck_balance == balance
    assert DuckTransaction.query.filter_by(user_id=sample_user_with_ducks.id).count() == 0


@pytest.mark.parametrize("count", [51, 10**30], ids=["just-over", "absurd"])
def test_submit_trade_rejects_more_ducks_than_the_balance(client, sample_user_with_ducks, count):
    assert sample_user_with_ducks.duck_balance == 50
    _login(client, sample_user_with_ducks)

    response = client.post(
        "/duck_trade/submit_trade",
        json={"digital_ducks": count, "bit_ducks": PLACES, "byte_ducks": PLACES},
        headers=AJAX,
    )

    assert response.status_code == 400
    assert response.get_json()["status"] == "error"
    assert DuckTradeLog.query.count() == 0


@pytest.mark.parametrize("raw", ["Infinity", "-Infinity", "1e400"])
def test_submit_trade_treats_a_non_finite_count_as_invalid(client, sample_user_with_ducks, raw):
    _login(client, sample_user_with_ducks)
    body = f'{{"digital_ducks": {raw}, "bit_ducks": {PLACES}, "byte_ducks": {PLACES}}}'

    response = client.post(
        "/duck_trade/submit_trade", data=body, content_type="application/json", headers=AJAX
    )

    assert response.status_code == 400
    assert response.get_json() == {"status": "error", "message": "Invalid duck count."}
    assert DuckTradeLog.query.count() == 0


@pytest.mark.parametrize(
    "payload",
    [
        {"data": {"digital_ducks": 3}},  # form-encoded body
        {"data": {}},  # empty form
        {"data": b"not json", "content_type": "application/json"},  # malformed JSON
        {"json": [1, 2, 3]},  # JSON, but not an object
        {"json": None},  # JSON null
    ],
    ids=["form", "empty-form", "malformed-json", "json-array", "json-null"],
)
def test_submit_trade_requires_json_object(
    client, sample_user_with_ducks, test_app, payload
):
    with test_app.app_context():
        _login(client, sample_user_with_ducks)
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()

        response = client.post("/duck_trade/submit_trade", **payload)

        assert response.status_code == 400
        assert response.get_json() == {
            "status": "error",
            "message": "JSON body required",
        }
        assert DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).count() == 0


def test_submit_trade_non_json_rejected_before_login_check(client):
    response = client.post("/duck_trade/submit_trade", data={"digital_ducks": 1})
    assert response.status_code == 400
    assert response.get_json()["message"] == "JSON body required"


@pytest.mark.parametrize(
    "bad",
    [
        None,  # key absent
        [],  # the empty arrays the legacy form path used to store
        [1, 0],  # too short
        [0] * 9,  # too long
        [0, 0, 0, 0, 0, 0, 0, -1],  # negative
        [0, 0, 0, 0, 0, 0, 0, "1"],  # string
        [0, 0, 0, 0, 0, 0, 0, 1.5],  # float
        [0, 0, 0, 0, 0, 0, 0, True],  # bool is not a count
        "00000000",  # not a list
        {"0": 1},  # not a list
    ],
    ids=[
        "missing",
        "empty",
        "short",
        "long",
        "negative",
        "string",
        "float",
        "bool",
        "str-not-list",
        "object",
    ],
)
@pytest.mark.parametrize("field", ["bit_ducks", "byte_ducks"])
def test_submit_trade_rejects_malformed_duck_arrays(
    client, sample_user_with_ducks, test_app, field, bad
):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()
        _login(client, sample_user_with_ducks)

        payload = {"digital_ducks": 2, "bit_ducks": PLACES, "byte_ducks": PLACES}
        if bad is None:
            del payload[field]
        else:
            payload[field] = bad

        response = client.post("/duck_trade/submit_trade", json=payload, headers=AJAX)

        assert response.status_code == 400
        body = response.get_json()
        assert body["status"] == "error"
        assert "8 non-negative integers" in body["message"]
        assert DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).count() == 0


def test_submit_trade_exception_handling(
    client, sample_user_with_ducks, test_app, monkeypatch
):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()
        _login(client, sample_user_with_ducks)

        def mock_commit(*args, **kwargs):
            raise Exception("DB Error")

        monkeypatch.setattr(db.session, "commit", mock_commit)

        response = client.post(
            "/duck_trade/submit_trade",
            json={"digital_ducks": 2, "bit_ducks": PLACES, "byte_ducks": PLACES},
            headers=AJAX,
        )
        assert response.status_code == 500
        assert response.get_json() == {"status": "error", "message": "Server Error"}


def test_submit_trade_existing_trade_ajax(client, sample_user_with_ducks, test_app):
    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        db.session.commit()
        _login(client, sample_user_with_ducks)

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
            headers=AJAX,
        )
        assert response.status_code == 400
        assert (
            response.get_json()["message"]
            == "You already have a pending trade. Please wait for it to be processed."
        )


def test_submit_trade_triggers_achievement(client, sample_user_with_ducks, test_app):
    from application.models.achievements import Achievement, UserAchievement

    with test_app.app_context():
        DuckTradeLog.query.filter_by(user_id=sample_user_with_ducks.id).delete()
        # Add a trade achievement with requirement 1
        ach = Achievement(name="Trade Initiate", slug="trade-initiate", type="trade", requirement_value="1", reward=5)
        db.session.add(ach)
        db.session.commit()

        _login(client, sample_user_with_ducks)

        response = client.post(
            "/duck_trade/submit_trade",
            json={"digital_ducks": 1, "bit_ducks": [1, 0, 0, 0, 0, 0, 0, 0], "byte_ducks": PLACES},
            headers=AJAX,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "success"
        assert "new_awards" in data
        assert any(a["slug"] == "trade-initiate" for a in data["new_awards"])

        # Check DB
        ua = UserAchievement.query.filter_by(user_id=sample_user_with_ducks.id, achievement_id=ach.id).first()
        assert ua is not None
