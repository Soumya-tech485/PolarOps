
"""Forecasting math: classification, Croston/SBA by hand, endpoint shapes."""
from app.services.forecasting import (classify_demand, croston_sba, days_to_stockout, risk_tier)

BHA = "bbbbbbbb-0000-0000-0000-000000000001"


def test_classify_intermittent_vs_continuous():
    sparse = [0] * 90
    sparse[10], sparse[40], sparse[77] = 2, 1, 3
    kind, adi, _ = classify_demand(sparse)
    assert kind == "intermittent" and adi > 1.32
    assert classify_demand([25.0] * 90)[0] == "continuous"


def test_croston_sba_hand_check():
    # first demand 5 at period 3 -> z=3; next demand 5 after 8 periods:
    # d_hat=5, z_hat=0.1*8+0.9*3=3.5 -> croston 5/3.5, SBA *0.95
    series = [0, 0, 5] + [0] * 7 + [5] + [0] * 5
    expected = (5 / 3.5) * 0.95
    assert abs(croston_sba(series, alpha=0.1) - expected) < 1e-9


def test_stockout_and_tiers():
    assert days_to_stockout(120, 10) == 12
    assert days_to_stockout(50, 0) is None
    assert risk_tier(5, 20) == "critical"
    assert risk_tier(25, 20) == "warning"
    assert risk_tier(60, 20) == "stable"


def test_forecast_endpoint_shapes(client, station_headers):
    r = client.get(f"/forecast?station_id={BHA}", headers=station_headers)
    assert r.status_code == 200
    lines = r.json()["lines"]
    assert lines
    assert {l["method"] for l in lines} <= {"croston_sba", "moving_average"}
    diesel = next(l for l in lines if "Diesel" in l["name"])
    assert diesel["method"] == "moving_average" and diesel["days_remaining"] is not None


def test_what_if_creates_criticals(client, logistics_headers):
    base = client.get(f"/forecast?station_id={BHA}", headers=logistics_headers).json()
    delayed = client.get(f"/forecast/what-if?station_id={BHA}&delay_days=120",
                         headers=logistics_headers).json()
    crit = lambda rep: sum(1 for l in rep["lines"] if l["risk_tier"] == "critical")
    assert crit(delayed) >= crit(base)
    assert delayed["new_eta_days"] == base["eta_days"] + 120