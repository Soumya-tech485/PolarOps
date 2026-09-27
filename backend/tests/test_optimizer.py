"""Optimizer: capacity/priority correctness, maintenance rule, <2s benchmark, endpoint."""
import random
import uuid

from app.services.optimizer import Candidate, build_and_solve

VOYAGE = "11111111-1111-1111-1111-111111111111"
BHA = "bbbbbbbb-0000-0000-0000-000000000001"


def _cands(n=100, seed=42):
    rng = random.Random(seed)
    return [Candidate(uuid.uuid4(), f"i-{i}", qty=rng.randint(1, 20),
                      weight_kg=rng.uniform(1, 500), volume_m3=rng.uniform(0.01, 2.0),
                      priority=rng.randint(1, 5)) for i in range(n)]


def test_benchmark_100_items_under_2s():
    sel, rej, st, secs = build_and_solve(_cands(), 20000.0, 100.0)
    assert secs < 2.0
    assert sum(c.qty * c.weight_kg for c in sel) <= 20000.0 + 1e-6
    assert sum(c.qty * c.volume_m3 for c in sel) <= 100.0 + 1e-6


def test_priority1_beats_priority5_when_tight():
    cands = [Candidate(uuid.uuid4(), "critical-med", qty=10, weight_kg=100, volume_m3=0.5, priority=1),
             Candidate(uuid.uuid4(), "nice-to-have", qty=10, weight_kg=100, volume_m3=0.5, priority=5)]
    sel, _, _, _ = build_and_solve(cands, 1000.0, 5.0)
    assert [c.item_name for c in sel] == ["critical-med"]


def test_maintenance_exclusion_is_absolute():
    cands = [Candidate(uuid.uuid4(), "broken-gen", qty=1, weight_kg=10, volume_m3=0.1,
                       priority=1, excluded_reason="asset due for maintenance — cannot ship")]
    sel, rej, _, _ = build_and_solve(cands, 10000.0, 100.0)
    assert sel == [] and rej[0].excluded_reason.startswith("asset")


def test_packing_endpoint_apply_flow(client, station_headers, logistics_headers):
    item = client.post("/cargo", json={"name": f"TEST-{uuid.uuid4().hex[:6]}", "category": "spares",
                                       "weight_kg": 5, "volume_m3": 0.05, "priority": 2,
                                       "quantity": 1, "station_id": BHA},
                       headers=logistics_headers).json()
    ind = client.post("/indents", json={"cargo_item_id": item["id"], "requested_qty": 2},
                      headers=station_headers).json()
    client.post(f"/indents/{ind['id']}/clear", json={"voyage_id": VOYAGE}, headers=logistics_headers)
    r = client.post("/optimize/packing", json={"voyage_id": VOYAGE, "apply": True}, headers=logistics_headers)
    assert r.status_code == 200
    body = r.json()
    mine = [m for m in body["selected"] if m["indent_id"] == ind["id"]]
    assert mine and mine[0]["stow_position"]
    assert body["solve_seconds"] < 2.0