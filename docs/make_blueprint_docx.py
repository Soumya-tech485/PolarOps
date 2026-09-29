# Generates PolarOps_Blueprint.docx — run: pip install python-docx && python make_blueprint_docx.py
from docx import Document
from docx.shared import Pt
doc = Document()

def h1(t): doc.add_heading(t, level=1)
def h2(t): doc.add_heading(t, level=2)
def p(t): doc.add_paragraph(t)
def b(t): doc.add_paragraph(t, style='List Bullet')
def code(t):
    par = doc.add_paragraph(); run = par.add_run(t)
    run.font.name = 'Consolas'; run.font.size = Pt(8.5)
def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers))
    try: t.style = 'Light Grid Accent 1'
    except Exception: t.style = 'Table Grid'
    for i, h in enumerate(headers): t.rows[0].cells[i].text = h
    for r in rows:
        c = t.add_row().cells
        for i, v in enumerate(r): c[i].text = v

# ---------------- COVER ----------------
doc.add_heading('PolarOps — Complete Project Blueprint & Handoff Document', 0)
p('SIH26062 · Integrated Polar Expedition Logistics and Asset Management System')
p('Issuer: NCPOR / Ministry of Earth Sciences · Theme: Smart Automation · Category: Software')
p('Event: SMART INDIA HACKATHON 2026 · Team: TechNexus · Team ID: (fill from SIH portal)')
p('Live prototype: https://polar-ops-nine.vercel.app/ · Repo: github.com/Soumya-tech485/PolarOps (branch: rebuild)')
p('Local path: C:\\Users\\soumy\\OneDrive\\Desktop\\PolarOps_Rebuild\\PolarOps · Environment: Windows 11 + VS Code + PowerShell')

# ---------------- 1 PROBLEM ----------------
h1('1. Problem Statement & Analysis')
p('The platform must cover five PS requirements; every feature maps to one:')
for x in ['Expedition planning', 'Cargo tracking', 'Inventory management', 'Personnel movement', 'Emergency response']: b(x)
p('Cross-cutting differentiator: offline-first — every module works with zero internet and auto-syncs on reconnect.')
h2('1.1 The four failures in the current system')
for x in ['Fragmented "ghost" inventory: manual tracking across the 14,000 km Goa-ship-station chain; records diverge from physical stock at -40 C.',
          'Zero delay-impact intelligence: 15-45 day weather delays; nothing predicts which life-critical item runs out first and when.',
          'Disconnected asset maintenance: paper schedules detached from spare-part stock; generators fail in extreme cold.',
          'Wasted cargo capacity: limited icebreaker kg/m3 loaded by guesswork, not priority mathematics.']: b(x)
h2('1.2 Research grounding')
for x in ['AAD eCon officially audit-reported unstable; Maximo data-accuracy issues (Australia).',
          'USAP: entire year of fuel/cargo arrives in ONE shipborne delivery - single point of failure.',
          'NCPOR runs scattered in-house tools (Bharati-TIMES etc.) - we UNIFY, not replace.',
          'Real voyages: Cape Town - Bharati - Maitri - Cape Town, Nov-Mar; lithium-ion batteries ship-only; box labels like "2 of 5".',
          'Spare-part demand is intermittent (long zero-use stretches, sudden spikes) - standard forecasting fails; Croston/SBA is correct.',
          'Naive "sync when online" offline designs silently lose conflicting edits - hence the outbox queue pattern.']: b(x)

# ---------------- 2 SOLUTION ----------------
h1('2. Solution, Value, Differentiators')
for x in ['One source of truth for the entire chain (Goa to station).',
          'Delay impact known before it happens: exact stockout dates + what to ship or ration.',
          'Maintenance tied to spare-part stock: every repair checks and deducts spares automatically.',
          'Cargo space allocated by mathematics: priority-score order per kg/m3.']: b(x)
p('Why different: purpose-built for polar extremes (generic ERPs assume stable chains); operates through satellite blackouts; transparent auditable math instead of black-box AI.')

# ---------------- 3 DECISIONS ----------------
h1('3. Locked Decisions & Known Limitations')
for x in ['Offline sync: Dexie.js + hand-built outbox (last-write-wins, conflicts logged). CRDT (PowerSync/ElectricSQL) mentioned as production path ONLY.',
          'Optimizer: Google OR-Tools CP-SAT (kg + m3 + priority) + maintenance-linked rule: asset due for maintenance cannot be ship-ready.',
          'All forecasting/optimization rule-based and explainable; NO machine learning in v1; ML gated on >=1 season of real data.',
          'Delay Stress-Test = validation-only harness (tests system reaction); never a user-facing feature.',
          'Audit: append-only hash-chained audit_log (prev_hash + row_hash); Indian Antarctic Act 2022 / DPDP alignment.']: b(x)
h2('3.1 Known limitations (stated proactively)')
for x in ['8-month winter total blackout is beyond typical offline-first scope.',
          'Ruggedized field hardware is outside software scope.',
          'A lost device loses only its own unsynced queue; other stations unaffected.',
          'Physical SAR stays external (COSPAS-SARSAT); app handles dispatch + tracking.']: b(x)

# ---------------- 4 TEAM + STACK ----------------
h1('4. Team Roster (exactly six) & Tech Stack per Member')
table(['Member', 'Role', 'Owns', 'Key technologies'],
 [['Me (user)', 'AI/ML #1 + Team Lead', 'forecasting.py, forecasting notebook, api-contract co-ownership, gates, demo', 'Croston/SBA (statsforecast or ~40 hand lines), rule-based risk scoring'],
  ['AI/ML #2', 'Optimization', 'optimizer.py, services/emergency.py state machine, optimizer notebook', 'OR-Tools CP-SAT, multi-constraint packing, what-if simulation'],
  ['UI/UX', 'Design', 'design-tokens.json, screens incl. offline/stale states, a11y (gloves/low light)', 'Figma, design tokens as data, high contrast + large tap targets'],
  ['Frontend', 'React PWA', 'frontend/src/** (lib trio first), PWA config, offline tiles', 'React 19+TS, Vite, Tailwind v4 @theme, Zustand, TanStack Query, RHF+Zod, Dexie+outbox, Leaflet, vite-plugin-pwa'],
  ['Backend', 'FastAPI', 'main.py, core/*, api/routes/*, sync_engine, middleware wiring, Dockerfile, deploy', 'FastAPI Py3.12, SQLAlchemy 2.0 async, Alembic, PyJWT (not python-jose), passlib[bcrypt], RBAC Depends(), APScheduler, Docker'],
  ['Database', 'PostgreSQL', 'db/schema.sql (critical path), models/, alembic, seeds, audit trigger, erd.png', 'PostgreSQL 17/18, PostGIS 3.6, Alembic migrations, Faker seeds, hash-chained audit log']])
p('Note: Dexie.js is frontend-side temporary offline storage, NOT the Database member\'s responsibility.')

# ---------------- 5 FOLDER STRUCTURE ----------------
h1('5. Full Folder & File Structure (normalized, Gate-0 verified)')
code('''polarops/
|- backend/
|  |- .env.example  Dockerfile  requirements.txt  runtime.txt  alembic.ini
|  |- app/
|  |  |- __init__.py  main.py            (FastAPI entry + /health + APScheduler)
|  |  |- alembic/ env.py  versions/
|  |  |- api/ __init__.py  routes/ __init__.py
|  |  |  |- auth.py voyages.py cargo.py indents.py inventory.py assets.py
|  |  |  |- personnel.py emergency.py forecast.py optimize.py sync.py audit.py
|  |  |- core/ __init__.py config.py security.py rbac.py
|  |  |- middleware/ __init__.py audit.py        (hash-chain writer)
|  |  |- models/ __init__.py + user station personnel voyage cargo indent
|  |  |          consumption asset emergency audit (.py each)
|  |  |- schemas/ __init__.py                     (Pydantic DTOs)
|  |  |- services/ __init__.py sync_engine.py forecasting.py optimizer.py emergency.py
|  |- tests/ conftest.py test_auth test_cargo test_sync test_emergency
|            test_forecast test_optimizer test_audit_tamper (.py each)
|- db/  schema.sql  erd.png  seed/ seed_personnel seed_cargo seed_voyages generate_demo_data
|- design/  figma-link.md  design-tokens.json  screens/  icon-set/
|- docs/  architecture.md  api-contract.md  demo-script.md  known-limitations.md
|        architecture_clean.svg  architecture_story.svg  PROJECT_STATE.md  MASTER_PROMPT.md
|- frontend/
|  |- package.json  vite.config.ts  tsconfig.json
|  |- public/ icons/  offline-map-tiles/
|  |- src/ main.tsx App.tsx
|     |- components/ui/
|     |- features/ auth cargo voyages inventory personnel emergency forecasting audit sync
|     |- hooks/ useOffline.ts useSyncStatus.ts
|     |- lib/ api.ts db.ts sync.ts
|     |- routes/ index.tsx
|     |- stores/ auth.ts sync.ts
|     |- styles/ theme.css
|- notebooks/ forecasting_prototype.ipynb  optimizer_prototype.ipynb
|- .env.example  .gitignore  docker-compose.yml  README.md''')

# ---------------- 6 ARCHITECTURE ----------------
h1('6. System Architecture (eight tiers, single attach points)')
code('''EDGE / CLIENT (React 19 PWA: Bharati / Maitri / Ship / Field tablet)
   features/ (9 modules) - stores/ (Zustand) - lib/api.ts - lib/sync.ts + lib/db.ts (Dexie outbox)
        |  POST /sync/batch  (idempotent client_uuid; conflicts logged, last-write-wins)
SYNC + SECURITY (FastAPI): main.py gateway - core/security.py (PyJWT+bcrypt)
   - core/rbac.py (require_role) - services/sync_engine.py - middleware/audit.py
        |  authenticated requests
CORE SERVICES: api/routes/ = auth voyages cargo indents inventory assets
   personnel emergency forecast optimize sync audit
        |                            |
INTELLIGENCE: services/forecasting.py (Croston/SBA + risk tiers)
   services/optimizer.py (CP-SAT kg+m3+priority, maintenance rule, what-if)
   services/emergency.py (SOS state machine)
        |
DATA: PostgreSQL 17/18 + PostGIS 3.6 - 10 tables - audit_log hash-chained
   - alembic/versions - db/seed (Faker)
        |
DASHBOARDS: station + logistics + admin views; NCPOR Goa command view
INTEGRATIONS (attach once): Iridium/VSAT satcom - COSPAS-SARSAT beacon pattern
   - DROMLAN flight feed - NCPOR Bharati-TIMES (unify) - OSM tile cache
INFRA (attach once): GitHub Actions CI/CD - Docker Compose - Render/Railway
   + keep-alive cron - Vercel - Neon/managed Postgres''')
p('[INSERT VISUAL DIAGRAM HERE: In Word use Insert > Pictures > This Device > docs/architecture_story.svg (Office 2019/365 renders SVG). Alternate dense version: docs/architecture_clean.svg.]')
h2('6.1 Story flow (non-technical narrative, badges 1-16)')
for x in ['1 Log what was used · 2 Request supplies · 3 Report asset fault · 4 Raise SOS (all at station, offline OK)',
          '5 Offline queue saves every action (Dexie outbox)',
          '6 Sync when signal returns · 7 Ship delayed? · 8 Show what runs out first (Croston/SBA) · 9 Rebuild priority cargo list',
          '10 Pack ship by priority (CP-SAT) · 11 Fits in ship? (no -> next voyage)',
          '12 Approve & stow · 13 Print QR, ship sails · 14 Scan QR, stock updates · 15 Goa dashboard live · 16 Record every step forever (hash-chained audit)',
          'Loop: stock truth feeds tomorrow\'s logging.']: b(x)
h2('6.2 Emergency state machine')
p('SOS_RAISED -> STATION_RESPONSE (<=48 h) -> ESCALATED_SAR -> RESOLVED; any state -> STOOD_DOWN (false alarm). Every transition audited; mirrors COSPAS-SARSAT no-contact pattern.')

# ---------------- 7 API + DB ----------------
h1('7. API Ownership Map (12 routes)')
table(['Route file', 'Endpoints', 'PS requirement'],
 [['auth.py', 'POST /auth/login, GET /auth/me', 'cross-cutting'],
  ['voyages.py', 'GET/POST /voyages, GET /voyages/{id}', '1 Expedition planning'],
  ['cargo.py', 'GET/POST /cargo, POST /cargo/{id}/status', '2 Cargo tracking'],
  ['indents.py', 'POST /indents, /{id}/clear, /reject, /receive', '2'],
  ['inventory.py', 'GET /inventory, POST /consumption', '3 Inventory'],
  ['forecast.py', 'GET /forecast, GET /forecast/what-if?delay_days=N', '3'],
  ['assets.py', 'assets + maintenance flags', '2/3'],
  ['personnel.py', 'roster, location, status', '4 Personnel'],
  ['emergency.py', 'POST /emergency/sos, /{id}/transition, GET /emergency', '5 Emergency'],
  ['optimize.py', 'POST /optimize/packing', '2'],
  ['sync.py', 'POST /sync/batch', 'offline differentiator'],
  ['audit.py', 'GET /audit (admin only)', 'compliance']])
h1('8. Database (10 tables)')
table(['Table', 'Purpose / key fields'],
 [['users', 'email, password_hash, role (station/logistics/admin)'],
  ['stations', 'code, geom(Point,4326), next_resupply_date'],
  ['personnel', 'station_id, status (active/in_transit/emergency), last_location, clearance_expiry'],
  ['voyages', 'route[], depart/arrive, capacity_kg, capacity_m3, delay_days'],
  ['cargo_items', 'weight_kg, volume_m3, priority, quantity, station_id, voyage_id, box_label'],
  ['indents', 'cargo_item_id, requested_qty, status(requested/cleared/rejected/received), qr_token, stow_position'],
  ['consumption_events', 'cargo_item_id, quantity>0, consumed_by, consumed_at'],
  ['assets', 'serial, station_id, maintenance_due BOOLEAN, next_maintenance'],
  ['emergency_events', 'station_id, raised_at, state, payload JSONB'],
  ['audit_log', 'ts, user, action, entity, details, prev_hash, row_hash - NEVER UPDATE/DELETE']])

# ---------------- 9 BUILD PLAN ----------------
h1('9. Build Plan (Phases 0-11, ~15 days)')
table(['Phase', 'Days', 'Work', 'Gate / done-when'],
 [['0', '0', 'Validate 5 pillars; lock Dexie+outbox + 5 entities', 'plan locked (DONE)'],
  ['1', '0', 'Tools, accounts, repo structure', 'skeleton committed (DONE)'],
  ['2', '1-3', 'Parallel: schema.sql (critical path), core+auth, FE setup+login, tokens, notebooks', '/health live; schema committed'],
  ['3', '4-5', 'Real shapes, mock cross-calls (all CRUD routes)', 'routes return seeded data'],
  ['4', '6-7', 'First real slice: auth + cargo + indents E2E', 'test_auth + test_cargo green'],
  ['5', '8-9', 'OFFLINE SYNC pair-sprint (BE+FE full time)', 'airplane-mode, 2-device conflict, long-queue tests pass'],
  ['6', '10', 'Personnel + emergency modules', 'test_emergency green; 48-h escalation logged'],
  ['7', '11-13', 'Intelligence UI + Goa dashboard + what-if', 'what-if demo-ready; optimizer <2 s @100 items'],
  ['8', '13', 'Security pass: RBAC sweep, tamper test, offline auth fallback', 'tamper detected; 403 matrix green'],
  ['9', '13-14', 'Resilience: live network kill, load test, known-limitations.md', 'demo survives network kill'],
  ['10', '14', 'Deploy: Render/Railway + keep-alive, Vercel, Compose fallback', 'public URL stable'],
  ['11', '14-15', 'Demo rehearsal incl. "kill the network" moment + backup video', 'full run <=8 min']])
h2('9.1 Git workflow rules')
for x in ['git pull --rebase before EVERY push.', 'Feature branches feature/<area>-<name>; merge via PR; 1 review + CI green.',
          'docs/api-contract.md updated in the SAME commit as any route change.', 'Force-push never on shared branches (only own feature branch).',
          'One owner per file-area per the roster table.']: b(x)

# ---------------- 10 PROGRESS ----------------
h1('10. Current Progress (update at every Gate)')
for x in ['DONE: Gate 0 skeleton normalized + committed; structure checker passed; final PPT content locked (8 slides); presentation script + judge Q&A prep; docs/architecture_clean.svg saved + rendering; architecture_story.svg (v3) delivered.',
          'VERIFY: starter content present (empty-file count), git push status of branch rebuild, architecture_story.svg saved.',
          'NOT STARTED (Gate 1+): models/schemas population, route logic, services logic, frontend lib trio + pages, seeds logic, alembic first migration, test contents, keep-alive deploy.']: b(x)

# ---------------- 11 DEMO ----------------
h1('11. Demo Plan & Judge Q&A Anchors')
p('Flow: login station -> KILL NETWORK -> consume + indent offline -> reconnect, sync applies -> forecast flips -> logistics clears indent (QR + stow) -> optimizer packs (maintenance-flagged asset visibly rejected) -> what-if 30-day delay -> SOS escalation timeline -> admin hash-chained audit trail.')
for x in ['Delay simulator? = validation-only harness, not a feature.', 'Why no ML? = explainable math now; ML gated on >=1 season real data.',
          'Offline how? = Dexie queue + auto-sync; conflicts server-wins + review list.', 'Different from AAD/USAP? = they solve pieces; we unify + offline + explainable.',
          'Cost? = Rs 0 free tiers; single-VM Docker pilot.']: b(x)

# ---------------- 12 STYLE ----------------
h1('12. Diagram & Document Style Rules')
for x in ['Clean story style: white canvas, whisper-tint containers, white nodes 1px borders, plain-verb labels, numbered badges, diamonds for decisions, ellipse terminators, hairline orthogonal wires, ONE feedback loop.',
          'SVG: ASCII-only text, orient="auto", validate tag balance before delivery.',
          'PPT: dense diagram = PDF/handout asset; hall slide = simple version; 16:9 sizing.']: b(x)

# ---------------- APPENDIX ----------------
h1('Appendix A — Master Continuation Prompt (paste into any new session)')
code('''ROLE: Senior Software Architect + Hackathon Technical Lead + Full-Stack + DevOps + Codebase Reviewer
for PolarOps (SIH26062, Team TechNexus, 6 members; user = team lead + AI/ML forecasting).
INGEST: read docs/PROJECT_STATE.md first; it is primary source; attachments are evidence.
SNAPSHOT: offline-first polar logistics; FastAPI monolith + React PWA + Postgres/PostGIS;
locked: Dexie+outbox (CRDT=production mention), CP-SAT + maintenance rule, rule-based no-ML v1,
Croston/SBA intermittent, hash-chained audit, delay stress-test = validation only.
STATUS: Gate 0 closed; Gate 1 not started. NEXT: Gate-1 packs (DB alembic+models; BE core+auth;
FE lib trio+login; UI tokens; AI notebooks).
RULES: PowerShell-safe commands only (no brace expansion, no find); contract-first; routes thin;
RBAC on every endpoint; every mutation -> audit row; complete paste-ready files; ASCII SVG;
restate Gate/DONE/NEXT before proposing work; end replies with 2-3 "say X" options.''')

doc.save('PolarOps_Blueprint.docx')
print('PolarOps_Blueprint.docx created')