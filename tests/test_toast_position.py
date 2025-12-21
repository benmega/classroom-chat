def test_toast_container_position(client, sample_user):
    """Ensure flash/toast container is positioned at bottom-right to avoid covering header icons."""
    # simulate logged-in user so base.html is rendered
    with client.session_transaction() as sess:
        sess["user"] = sample_user.username

    response = client.get("/")
    html = response.get_data(as_text=True)
    assert "toast-container position-fixed bottom-0 end-0 p-3" in html
