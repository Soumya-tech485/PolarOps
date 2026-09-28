"""Auth + RBAC behaviour: success paths, wrong credentials, token walls."""


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_login_success(client):
    r = client.post("/auth/login", json={"email": "logistics@ncpor.gov.in", "password": "polar123"})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["role"] == "logistics"
    assert body["access_token"].count(".") == 2


def test_login_wrong_password(client):
    r = client.post("/auth/login", json={"email": "admin@ncpor.gov.in", "password": "nope123"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/auth/login", json={"email": "ghost@ncpor.gov.in", "password": "polar123"})
    assert r.status_code == 401


def test_me_with_token(client, admin_headers):
    r = client.get("/auth/me", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["email"] == "admin@ncpor.gov.in"


def test_me_without_token(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_garbage_token(client):
    r = client.get("/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401


def test_admin_endpoint_blocks_station(client, station_headers):
    assert client.get("/auth/admin-ping", headers=station_headers).status_code == 403


def test_admin_endpoint_allows_admin(client, admin_headers):
    r = client.get("/auth/admin-ping", headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["ping"] == "pong"