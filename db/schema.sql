-- PolarOps database schema
-- Merged Gate 1 skeleton + demo build
-- DB member owns evolution via Alembic.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;


-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'admin',
      'station_lead',
      'logistics_officer',
      'medical_officer',
      'member'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================================================
-- STATIONS
-- =========================================================

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  location GEOMETRY(Point, 4326),
  next_resupply_date DATE
);


-- =========================================================
-- PERSONNEL
-- =========================================================

CREATE TABLE personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  role_title TEXT,
  station_id UUID REFERENCES stations(id),

  last_known_location GEOMETRY(Point, 4326),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'in_transit', 'emergency')),

  clearance_expiry DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- =========================================================
-- ASSETS
-- =========================================================

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial TEXT UNIQUE,
  name TEXT NOT NULL,
  station_id UUID REFERENCES stations(id),

  maintenance_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (maintenance_status IN ('ok', 'due', 'under_repair')),

  maintenance_due BOOLEAN NOT NULL DEFAULT false,
  last_serviced_at DATE,
  next_maintenance DATE
);


-- =========================================================
-- VOYAGES
-- =========================================================

CREATE TABLE voyages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,

  departure_station_id UUID REFERENCES stations(id),
  arrival_station_id UUID REFERENCES stations(id),

  departure_station TEXT,
  arrival_station TEXT,

  departure_date DATE,
  arrival_date DATE,

  route GEOMETRY(LineString, 4326),

  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_transit', 'delayed', 'completed', 'cancelled')),

  delay_days INT NOT NULL DEFAULT 0,

  weight_capacity_kg NUMERIC NOT NULL DEFAULT 20000,
  volume_capacity_m3 NUMERIC NOT NULL DEFAULT 120
);


-- =========================================================
-- CARGO ITEMS
-- =========================================================

CREATE TABLE cargo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  category TEXT,

  weight_kg NUMERIC,
  volume_m3 NUMERIC,

  priority INT DEFAULT 3,
  quantity NUMERIC DEFAULT 0,

  status TEXT DEFAULT 'in_inventory'
    CHECK (status IN (
      'in_inventory',
      'reserved',
      'shipped',
      'delivered'
    )),

  station_id UUID REFERENCES stations(id),
  voyage_id UUID REFERENCES voyages(id),
  asset_id UUID REFERENCES assets(id),

  box_label TEXT,
  qr_token TEXT,
  stow_position TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================================================
-- INDENTS
-- =========================================================

CREATE TABLE indents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  requested_by UUID REFERENCES personnel(id),
  created_by UUID REFERENCES users(id),

  cargo_item_id UUID REFERENCES cargo_items(id),

  quantity_requested NUMERIC NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'approved',
      'rejected',
      'fulfilled'
    )),

  qr_token TEXT,
  stow_position TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================================================
-- CONSUMPTION EVENTS
-- =========================================================

CREATE TABLE consumption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cargo_item_id UUID NOT NULL REFERENCES cargo_items(id),
  station_id UUID REFERENCES stations(id),

  quantity_used NUMERIC NOT NULL CHECK (quantity_used > 0),

  logged_by UUID REFERENCES personnel(id),
  consumed_by UUID REFERENCES users(id),

  notes TEXT,

  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================================================
-- EMERGENCY EVENTS
-- =========================================================

CREATE TABLE emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  reported_by UUID REFERENCES personnel(id),
  raised_by UUID REFERENCES users(id),

  station_id UUID NOT NULL REFERENCES stations(id),

  location GEOMETRY(Point, 4326),

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open',
      'acknowledged',
      'escalated',
      'resolved'
    )),

  description TEXT,
  payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================================================
-- AUDIT LOG
-- =========================================================
-- Hash-chained append-only audit log.
-- Never UPDATE or DELETE audit_log rows.

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity_type TEXT NOT NULL,
  entity_id UUID,

  action TEXT NOT NULL,

  performed_by UUID REFERENCES users(id),

  payload JSONB,

  prev_hash TEXT,
  row_hash TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_cargo_station
  ON cargo_items(station_id);

CREATE INDEX idx_cargo_voyage
  ON cargo_items(voyage_id);

CREATE INDEX idx_personnel_station
  ON personnel(station_id);

CREATE INDEX idx_emergency_status
  ON emergency_events(status);

CREATE INDEX idx_consumption_item
  ON consumption_events(cargo_item_id, logged_at);

CREATE INDEX idx_indents_status
  ON indents(status);

CREATE INDEX idx_voyages_departure_date
  ON voyages(departure_date);


-- =========================================================
-- END OF SCHEMA
-- =========================================================