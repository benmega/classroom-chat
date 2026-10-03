def test_server_info_routes(client):
    resp = client.get("/server/health")
    assert resp.status_code == 200
    assert resp.data == b"SystemHealthy"

    # The host-IP endpoint was removed; it must not come back unauthenticated
    resp = client.get("/server/ip")
    assert resp.status_code == 404
