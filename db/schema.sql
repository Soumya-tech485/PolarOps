-- PolarOps schema skeleton (Gate 1). DB member owns evolution via Alembic.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('station','logistics','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  geom geometry(Point, 4326),
  next_resupply_date DATE
);

CREATE TABLE personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role_title TEXT,
  station_id UUID REFERENCES stations(id),
  status TEXT NOT NULL DEFAULT 'active'
         CHECK (status IN ('active','in_transit','emergency')),
  last_location TEXT,
  last_update TIMESTAMPTZ,
  clearance_expiry DATE
);

CREATE TABLE voyages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT[] NOT NULL,
  depart_date DATE,
  arrive_date DATE,
  status TEXT NOT NULL DEFAULT 'planned',
  capacity_kg NUMERIC,
  capacity_m3 NUMERIC,
  delay_days INT NOT NULL DEFAULT 0
);

CREATE TABLE cargo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  weight_kg NUMERIC,
  volume_m3 NUMERIC,
  priority INT DEFAULT 3,
  quantity NUMERIC DEFAULT 0,
  station_id UUID REFERENCES stations(id),
  voyage_id UUID REFERENCES voyages(id),
  box_label TEXT
);

CREATE TABLE indents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_item_id UUID NOT NULL REFERENCES cargo_items(id),
  requested_qty NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
         CHECK (status IN ('requested','cleared','rejected','received')),
  qr_token TEXT,
  stow_position TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consumption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_item_id UUID NOT NULL REFERENCES cargo_items(id),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  consumed_by UUID REFERENCES users(id),
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  station_id UUID REFERENCES stations(id),
  status TEXT,
  maintenance_due BOOLEAN NOT NULL DEFAULT false,
  next_maintenance DATE
);

CREATE TABLE emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id),
  raised_by UUID REFERENCES users(id),
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  state TEXT NOT NULL DEFAULT 'SOS_RAISED',
  payload JSONB
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  prev_hash TEXT,
  row_hash TEXT
);
-- NEVER UPDATE/DELETE on audit_log. Tamper-block trigger added in Phase 8.
