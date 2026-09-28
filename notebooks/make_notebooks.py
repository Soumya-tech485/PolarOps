
"""Generate both prototype notebooks as valid .ipynb from readable source.
Run from repo root:  python notebooks/make_notebooks.py
"""
import json
import os

FORECAST_CELLS = [
    ("markdown", "# Forecasting prototype — intermittent demand\nCroston/SBA vs naive moving average on synthetic spare-part history."),
    ("code", "import sys, random\nsys.path.append('../backend')\nfrom app.services.forecasting import classify_demand, croston_sba, moving_average\n\nrng = random.Random(7)\nspares = [0]*90\nfor d in (12, 31, 58):\n    spares[d] = rng.randint(1, 3)\ndiesel = [rng.randint(140, 170) for _ in range(90)]"),
    ("code", "print('spares  ->', classify_demand(spares))\nprint('diesel  ->', classify_demand(diesel))"),
    ("code", "print('spares rate  Croston/SBA:', round(croston_sba(spares), 4), ' naive MA:', round(moving_average(spares), 4))\nprint('diesel rate  Croston/SBA:', round(croston_sba(diesel), 4), ' naive MA:', round(moving_average(diesel), 4))\nprint('MA over-states spare demand -> wrong air-drops; Croston fixes it.')"),
]

OPTIMIZER_CELLS = [
    ("markdown", "# Optimizer prototype — CP-SAT benchmark\nMust pack 100 realistic items in < 2 seconds (locked acceptance target)."),
    ("code", "import sys, random, time, uuid\nsys.path.append('../backend')\nfrom app.services.optimizer import Candidate, build_and_solve\n\nrng = random.Random(42)\ncands = [\n    Candidate(uuid.uuid4(), f'item-{i}', qty=rng.randint(1, 20),\n              weight_kg=rng.uniform(1, 500), volume_m3=rng.uniform(0.01, 2.0),\n              priority=rng.randint(1, 5))\n    for i in range(100)\n]"),
    ("code", "sel, rej, st, secs = build_and_solve(cands, 20000.0, 100.0)\nprint(f'status={st} selected={len(sel)} rejected={len(rej)} seconds={secs:.3f}')\nassert secs < 2.0, 'optimizer too slow for acceptance'\nprint('kg used:', round(sum(c.qty*c.weight_kg for c in sel), 1), '<= 20000')"),
]


def write_nb(path: str, cells):
    nb = {
        "cells": [
            {"cell_type": kind, "metadata": {}, "source": src.splitlines(keepends=True),
             **({"outputs": [], "execution_count": None} if kind == "code" else {})}
            for kind, src in cells
        ],
        "metadata": {"kernelspec": {"name": "python3", "display_name": "Python 3"},
                     "language_info": {"name": "python"}},
        "nbformat": 4, "nbformat_minor": 5,
    }
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, indent=1)
    print("wrote", path)


if _name_ == "_main_":
    here = os.path.dirname(os.path.abspath(_file_))
    write_nb(os.path.join(here, "forecasting_prototype.ipynb"), FORECAST_CELLS)
    write_nb(os.path.join(here, "optimizer_prototype.ipynb"), OPTIMIZER_CELLS)