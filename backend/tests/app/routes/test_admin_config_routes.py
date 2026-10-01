import pytest
from application.models.banned_words import BannedWords
from application.models.configuration import Configuration


def login_as_admin(client, admin_user):
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
        sess["user"] = admin_user.id


def test_admin_config_routes(client, sample_admin, init_db):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/toggle-message-sending")
    assert resp.status_code == 200
    assert resp.json["success"] is True

    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 2.5})
    assert resp.status_code == 200
    assert resp.json["success"] is True
    assert resp.json["new_multiplier"] == 2.5

    resp = client.post("/api/admin/update_duck_multiplier", json={})
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/update_duck_multiplier", json={"multiplier": "invalid"}
    )
    assert resp.status_code == 400

    resp = client.post(
        "/api/admin/add-banned-word", data={"word": "badword", "reason": "offensive"}
    )
    assert resp.status_code == 200
    assert resp.json["success"] is True

    # Duplicate banned word
    resp = client.post("/api/admin/add-banned-word", data={"word": "badword"})
    assert resp.status_code == 400

    # Empty word
    resp = client.post("/api/admin/add-banned-word", data={})
    assert resp.status_code == 400


def test_ai_teacher_routes_removed(test_app):
    """The AI teacher feature was removed: neither its admin toggle nor its
    chat endpoint is registered any more."""
    rules = [rule.rule for rule in test_app.url_map.iter_rules()]

    assert "/api/admin/toggle-ai" not in rules
    assert not any(rule.startswith("/ai/") for rule in rules)


@pytest.mark.parametrize(
    "value",
    [float("nan"), float("inf"), float("-inf"), -1, -0.5, 100.01, "nan", "inf", "-3"],
)
def test_update_duck_multiplier_rejects_out_of_range(
    client, sample_admin, sample_configuration, value
):
    login_as_admin(client, sample_admin)
    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": 2.0})
    assert resp.status_code == 200

    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": value})

    assert resp.status_code == 400
    assert resp.json["success"] is False
    # The previously stored multiplier is untouched.
    assert Configuration.query.first().duck_multiplier == 2.0


def test_update_duck_multiplier_rejects_value_too_large_for_a_float(
    client, sample_admin, sample_configuration
):
    login_as_admin(client, sample_admin)

    # float(10**400) raises OverflowError; that is a bad value (400), not a server error.
    resp = client.post(
        "/api/admin/update_duck_multiplier", json={"multiplier": 10**400}
    )

    assert resp.status_code == 400
    assert resp.json["success"] is False


@pytest.mark.parametrize("value", [0, 0.0, "0", 1, 100, 99.9])
def test_update_duck_multiplier_accepts_boundaries(
    client, sample_admin, sample_configuration, value
):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/update_duck_multiplier", json={"multiplier": value})

    assert resp.status_code == 200
    assert resp.json["new_multiplier"] == float(value)
    assert Configuration.query.first().duck_multiplier == float(value)


def test_add_banned_word_strips_whitespace(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/add-banned-word", data={"word": "  padded 	"})

    assert resp.status_code == 200
    assert "'padded'" in resp.json["message"]
    assert [w.word for w in BannedWords.query.filter_by(word="padded")] == ["padded"]
    assert BannedWords.query.filter(BannedWords.word.like("% %")).count() == 0


def test_add_banned_word_duplicate_after_trimming_is_rejected(client, sample_admin):
    login_as_admin(client, sample_admin)
    assert client.post("/api/admin/add-banned-word", data={"word": "bad"}).status_code == 200

    resp = client.post("/api/admin/add-banned-word", data={"word": "  bad  "})

    assert resp.status_code == 400
    assert resp.json["message"] == "Word already banned"
    assert BannedWords.query.filter_by(word="bad").count() == 1


def test_add_banned_word_whitespace_only_is_empty(client, sample_admin):
    login_as_admin(client, sample_admin)

    resp = client.post("/api/admin/add-banned-word", data={"word": "   "})

    assert resp.status_code == 400
    assert resp.json["message"] == "Word cannot be empty"
