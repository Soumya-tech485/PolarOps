
"""RED TEAM PROOF 3: CP-SAT 100-Item Stress Benchmark (<2.0 s, physics respected)."""
import random
import time
import uuid

from app.services.optimizer import Candidate, build_and_solve


def test_100_item_chaotic_benchmark():
    rng = random.Random(99)
    candidates = [
        Candidate(uuid.uuid4(), f"CHAOS-ITEM-{i}", qty=rng.randint(1, 50),
                  weight_kg=rng.uniform(0.5, 800.0), volume_m3=rng.uniform(0.001, 4.0),
                  priority=rng.randint(1, 5))
        for i in range(100)
    ]
    capacity_kg, capacity_m3 = 25000.0, 120.0

    t0 = time.perf_counter()
    selected, rejected, status, seconds = build_and_solve(candidates, capacity_kg, capacity_m3, time_limit=2.0)
    elapsed = time.perf_counter() - t0

    assert elapsed < 2.0, f"CRITICAL: Solver took {elapsed:.2f}s. Target is < 2.0s!"
    total_kg = sum(c.qty * c.weight_kg for c in selected)
    total_m3 = sum(c.qty * c.volume_m3 for c in selected)
    assert total_kg <= capacity_kg + 1e-6, "Ship overweight!"
    assert total_m3 <= capacity_m3 + 1e-6, "Ship over volume!"
    assert status in ("OPTIMAL", "FEASIBLE"), f"Solver failed with status: {status}"
    print(f"\n[RED TEAM PASS] Packed {len(selected)}/100 items in {elapsed:.3f}s. "
          f"Weight: {total_kg:.0f}/{capacity_kg}kg. Status: {status}.")