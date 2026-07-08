
def test_server_info_routes(client):
    # Test health check
    resp = client.get("/server/health")
    assert resp.status_code == 200
    assert resp.data == b"SystemHealthy"

    # Test IP check
    resp = client.get("/server/ip")
    assert resp.status_code == 200
    assert "ip" in resp.json
