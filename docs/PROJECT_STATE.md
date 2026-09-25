# PolarOps — PROJECT STATE & HANDOFF DOCUMENT
Living source of truth for continuation sessions. Update "Progress" section at every Gate.
Last updated: after SVG diagram phase, pre-Gate-1.

## 1. IDENTITY
- PS: SIH26062 — Integrated Polar Expedition Logistics and Asset Management System
- Issuer: NCPOR / Ministry of Earth Sciences · Theme: Smart Automation · Category: Software
- Event: SMART INDIA HACKATHON 2026 · Team: TechNexus · Team ID: (fill from portal)
- Project: PolarOps · Live prototype: https://polar-ops-nine.vercel.app/
- Repo: https://github.com/Soumya-tech485/PolarOps.git · branch: rebuild
- Local path: C:\Users\soumy\OneDrive\Desktop\PolarOps_Rebuild\PolarOps
- Environment: Windows 11, VS Code, PowerShell terminal (Git Bash available). PS pitfalls hit before:
  no brace expansion, `find` = findstr (use Get-ChildItem), Set-Content encoding matters,
  clipboard writes whatever was last copied (banned for file creation).

## 2. PS REQUIREMENTS (every feature maps to one)
1 Expedition planning · 2 Cargo tracking · 3 Inventory management · 4 Personnel movement · 5 Emergency response
Cross-cutting differentiator: offline-first (zero internet → auto-sync on reconnect).

## 3. PROBLEM ANALYSIS (locked)
Four problems: fragmented "ghost" inventory (14,000 km manual chain); zero delay-impact intelligence
(15–45 day weather delays); disconnected asset maintenance (paper vs spare stock); wasted cargo capacity
(kg/m³ loaded by guesswork).
Research grounding: AAD eCon officially audit-reported unstable; Maximo data-accuracy issues; USAP whole-year
single-ship delivery risk; NCPOR scattered tools (Bharati-TIMES) — we UNIFY, not replace; real voyage
Cape Town→Bharati→Maitri→Cape Town, Nov–Mar; lithium-ion batteries ship-only; box labels "2 of 5";
spare demand intermittent → Croston/SBA; naive offline sync loses edits → outbox queue pattern.

## 4. LOCKED DECISIONS (do not revisit)
- Offline: Dexie.js + hand-built outbox; last-write-wins + logged conflicts; CRDT (PowerSync) = production mention ONLY.
- Optimizer: OR-Tools CP-SAT (kg+m³+priority) + maintenance-linked rule (asset due for maintenance ≠ ship-ready).
- Intelligence: rule-based explainable ONLY; NO ML in v1; ML gated on ≥1 season real data.
- Delay Stress-Test = VALIDATION-ONLY harness (tests system reaction); NEVER a user-facing feature.
- Audit: append-only hash-chained audit_log (prev_hash+row_hash); Indian Antarctic Act 2022 / DPDP alignment.
- Known limitations (state proactively): 8-month winter beyond typical offline scope; ruggedized hardware out of scope;
  lost device loses only own unsynced queue; physical SAR stays external (COSPAS-SARSAT pattern mirrored in state machine).

## 5. TEAM (exactly six — never invent others)
| Member | Role | Owns |
|---|---|---|
| Me (user) | AI/ML #1 + TEAM LEAD | forecasting.py, notebooks/forecasting, api-contract co-ownership, gates, demo, PR reviews |
| AI/ML #2 | Optimization | optimizer.py, services/emergency.py state machine, notebooks/optimizer, test_optimizer |
| UI/UX | Design | design-tokens.json, screens incl. offline/stale states, a11y (gloves/low-light), theme.css values |
| Frontend | React PWA | frontend/src/** (lib trio first), PWA config, offline tiles |
| Backend | FastAPI | main.py, core/*, api/routes/*, sync_engine, middleware wiring, Dockerfile, deploy |
| Database | Postgres | db/schema.sql (critical path), models/, alembic, seeds, audit trigger, erd.png |

## 6. TECH STACK (per docx, verified)
BE: FastAPI Py3.12, SQLAlchemy 2.0 async, Alembic, PyJWT (not python-jose), passlib[bcrypt], RBAC Depends(),
APScheduler, Docker Compose. FE: React 19+TS, Vite, Tailwind v4 (@theme), Zustand, TanStack Query,
RHF+Zod, Dexie+outbox, Leaflet+react-leaflet, vite-plugin-pwa. DB: PostgreSQL 17/18 + PostGIS 3.6, Faker seeds.
AI: Croston/SBA via statsforecast (or ~40 hand lines), OR-Tools CP-SAT. Host: Vercel + Render/Railway + Neon, keep-alive cron.

## 7. REPO STRUCTURE (normalized, verified Gate 0)
backend/app/{main.py, alembic/{env.py,versions}, api/routes/{auth,voyages,cargo,indents,inventory,assets,
personnel,emergency,forecast,optimize,sync,audit}.py, core/{config,security,rbac}.py, middleware/audit.py,
models/(10 entity files), schemas/, services/{sync_engine,forecasting,optimizer,emergency}.py},
backend/tests/(conftest + 7 tests), db/{schema.sql,erd.png,seed/4 files}, design/, docs/(architecture.md,
api-contract.md, demo-script.md, known-limitations.md, architecture_clean.svg, architecture_story.svg*),
frontend/{package.json,vite.config.ts,tsconfig.json, public/{icons,offline-map-tiles}, src/{main.tsx,App.tsx,
components/ui, features/9 folders, hooks/2, lib/{api,db,sync}.ts, routes/index.tsx, stores/2, styles/theme.css}},
notebooks/2, root infra files. (* = provided, save-status unverified)

## 8. PROGRESS (update at every Gate)
DONE: Gate 0 skeleton normalized+committed; structure checker passed (all folders, no extras, no old names);
final PPT content locked (all 8 slides); full presentation script + judge Q&A prep; docs/architecture_clean.svg
saved+rendering (v2); architecture_story.svg (v3 story-style) delivered.
VERIFY NOW: (a) starter content present? `Get-ChildItem -Recurse -File | Where-Object { $_.Length -eq 0 -and $_.FullName -notmatch '\\.git\\' } | Measure-Object`
(b) git pushed? `git status -sb; git log --oneline -3` (c) architecture_story.svg exists?
NOT STARTED (Gate 1+): all functional code — models/schemas population, route logic, services logic,
frontend lib trio + pages, seeds logic, alembic first migration, tests content, deploy keep-alive.

## 9. BUILD PLAN (phases + gates, from docx + team mapping)
P0 validate+lock (done) · P1 D0 tools+structure (done) · P2 D1–3 parallel build; schema.sql = critical path ·
P3 D4–5 real shapes, mock cross-calls · P4 D6–7 first real slice auth+cargo · P5 D8–9 OFFLINE SYNC PAIR-SPRINT
(BE+FE full-time; tests: airplane mode, 2-device conflict, long queue) · P6 D10 personnel+emergency ·
P7 D11–13 intelligence UI + Goa dashboard + what-if · P8 D13 security pass (RBAC sweep, tamper test, offline auth fallback) ·
P9 D13–14 resilience (live network kill, 100-item optimizer test, known-limitations.md) · P10 D14 deploy ·
P11 D14–15 demo rehearsal incl. "kill the network" moment + backup video.
Git rules: pull --rebase before every push; feature branches + PRs; contract updated same commit as route change;
force-push never on shared branch.

## 10. API OWNERSHIP (12 routes) & DB (10 tables)
Routes: auth, voyages, cargo, indents, inventory, assets, personnel, emergency, forecast(+what-if),
optimize(packing), sync(POST /sync/batch), audit(admin).
Tables: users, stations, personnel, voyages, cargo_items, indents, consumption_events, assets,
emergency_events, audit_log(hash-chained). Emergency states: SOS_RAISED→STATION_RESPONSE(48h)→ESCALATED_SAR→RESOLVED/STOOD_DOWN.

## 11. DIAGRAM / PPT STYLE RULES (for any regenerated visual)
Clean "story" style: white canvas; whisper-tint containers; white nodes with 1px #bbb borders; plain-verb labels
(≤3 words) with tech names only as 6.5px sub-labels; numbered badges; diamonds for decisions; ellipse terminators;
hairline orthogonal wires in channels + ONE feedback loop; ASCII-only text; orient="auto"; validate tag balance
before delivery. PPT: 16:9, dense diagram = PDF/handout asset, hall slide = simple version.

## 12. ASSISTANT STYLE PREFERENCES
Simple English; tables + copy-paste terminal blocks; PowerShell-safe commands (flag bash-only syntax);
complete paste-ready files, placeholders marked; end replies with 2–3 "say X" continuation options;
never re-guess roster or resurrect rejected ideas (e.g., ML in v1, delay-simulator-as-feature).