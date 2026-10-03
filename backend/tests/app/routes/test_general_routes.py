from flask import url_for


def test_index_logged_in(client, sample_user):
    with client.session_transaction() as sess:
        sess["user"] = sample_user.id

    response = client.get(url_for("general.index"))

    assert response.status_code == 200
    assert b"Classroom Chat" in response.data


def test_index_not_logged_in(client):
    with client.application.app_context():
        response = client.get(url_for("general.index"))

        assert response.status_code == 200
        assert b"Classroom Chat" in response.data
