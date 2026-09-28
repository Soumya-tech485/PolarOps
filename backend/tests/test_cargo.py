"""End-to-end logistics behaviour: lifecycle, capacity gate, QR, stock math."""
import uuid

DIESEL = "55555555-5555-5555-5555-000000000001"
VOYAGE = "11111111-1111-1111-1111-111111111111"
PERSON = "77777777-7777-7777-7777-000000000004"
BHA = "bbbbbbbb-0000-0000-0000-000000000001"


def _make_item(client, logistics_headers, kg=1.0, m3=0.01, qty=10.0):
    r = client.post(
        "/cargo",
        json={"name": f"TEST-{uuid.uuid4().hex[:6]}", "category": "spares",
              "weight_kg": kg, "volume_m3": m3, "priority": 2, "quantity": qty,
              "station_id": BHA},
        headers=logistics_headers,
    )
    assert r.status_code == 201
    return r.json()


def test_station_cannot_create_cargo(client, station_headers):
    r = client.post("/cargo", json={"name": "TEST-nope"}, headers=station_headers)
    assert r.status_code == 403


def test_indent_full_lifecycle(client, station_headers, logistics_headers):
    item = _make_item(client, logistics_headers, kg=2.0, m3=0.01, qty=5.0)
    before = item["quantity"]

    ind = client.post("/indents", json={"cargo_item_id": item["id"], "requested_qty": 4},
                      headers=station_headers).json()
    assert ind["status"] == "requested"

    r = client.post(f"/indents/{ind['id']}/clear", json={"voyage_id": VOYAGE}, headers=logistics_headers)
    assert r.status_code == 200 and r.json()["status"] == "cleared"

    r = client.post(f"/indents/{ind['id']}/stow", json={"stow_position": "TEST-HOLD-A"}, headers=logistics_headers)
    assert r.status_code == 200
    qr = r.json()["qr_token"]
    assert qr

    r = client.post(f"/indents/{ind['id']}/ship", headers=logistics_headers)
    assert r.status_code == 200 and r.json()["status"] == "shipped"

    r = client.post(f"/indents/{ind['id']}/receive", json={"qr_token": qr}, headers=station_headers)
    assert r.status_code == 200 and r.json()["status"] == "received"

    stock = client.get(f"/cargo/{item['id']}", headers=station_headers).json()
    assert stock["quantity"] == before + 4


def test_receive_with_wrong_qr_fails(client, station_headers, logistics_headers):
    item = _make_item(client, logistics_headers)
    ind = client.post("/indents", json={"cargo_item_id": item["id"], "requested_qty": 1},
                      headers=station_headers).json()
    client.post(f"/indents/{ind['id']}/clear", json={"voyage_id": VOYAGE}, headers=logistics_headers)
    client.post(f"/indents/{ind['id']}/stow", json={"stow_position": "TEST-HOLD-B"}, headers=logistics_headers)
    client.post(f"/indents/{ind['id']}/ship", headers=logistics_headers)
    r = client.post(f"/indents/{ind['id']}/receive", json={"qr_token": "wrong-token"}, headers=station_headers)
    assert r.status_code == 400


def test_stow_capacity_gate_rejects_overload(client, station_headers, logistics_headers):
    item = _make_item(client, logistics_headers, kg=200000.0, m3=1.0)
    ind = client.post("/indents", json={"cargo_item_id": item["id"], "requested_qty": 2},
                      headers=station_headers).json()
    client.post(f"/indents/{ind['id']}/clear", json={"voyage_id": VOYAGE}, headers=logistics_headers)
    r = client.post(f"/indents/{ind['id']}/stow", json={"stow_position": "TEST-HOLD-C"}, headers=logistics_headers)
    assert r.status_code == 409


def test_wrong_state_is_409(client, station_headers, logistics_headers):
    item = _make_item(client, logistics_headers)
    ind = client.post("/indents", json={"cargo_item_id": item["id"], "requested_qty": 1},
                      headers=station_headers).json()
    r = client.post(f"/indents/{ind['id']}/ship", headers=logistics_headers)
    assert r.status_code == 409


def test_consumption_flow(client, logistics_headers, station_headers):
    item = _make_item(client, logistics_headers, qty=10.0)
    r = client.post("/inventory/consumption",
                    json={"cargo_item_id": item["id"], "quantity": 3, "notes": "TEST burn"},
                    headers=station_headers)
    assert r.status_code == 200 and r.json()["quantity"] == 7.0
    r = client.post("/inventory/consumption",
                    json={"cargo_item_id": item["id"], "quantity": 999},
                    headers=station_headers)
    assert r.status_code == 400
    hist = client.get(f"/inventory/consumption?cargo_item_id={item['id']}", headers=station_headers).json()
    assert any(h["notes"] == "TEST burn" for h in hist)


def test_manifest_and_voyage_detail(client, logistics_headers, station_headers):
    item = _make_item(client, logistics_headers)
    ind = client.post("/indents", json={"cargo_item_id": item["id"], "requested_qty": 2},
                      headers=station_headers).json()
    client.post(f"/indents/{ind['id']}/clear", json={"voyage_id": VOYAGE}, headers=logistics_headers)
    client.post(f"/indents/{ind['id']}/stow", json={"stow_position": "TEST-HOLD-D"}, headers=logistics_headers)

    manifest = client.get(f"/cargo/manifest?voyage_id={VOYAGE}", headers=station_headers).json()
    assert any(line["indent_id"] == ind["id"] and line["stow_position"] == "TEST-HOLD-D" for line in manifest)

    r = client.post(f"/voyages/{VOYAGE}/assign",
                    json={"personnel_id": PERSON, "role_on_board": "TEST technician"},
                    headers=logistics_headers)
    assert r.status_code == 200
    assert any(c["personnel_id"] == PERSON for c in r.json()["crew"])