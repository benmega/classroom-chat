def test_server_info_routes(client):
    resp = client.get("/server/health")
    assert resp.status_code == 200
    assert resp.data == b"SystemHealthy"

    resp = client.get("/server/ip")
    assert resp.status_code == 200
    assert "ip" in resp.json
