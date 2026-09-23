-- PolarOps database schema — demo build (extends the reference schema)
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN('admin','station_lead','logistics_officer','medical_officer','member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE stations(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location GEOMETRY(Point, 4326)
);

CREATE TABLE personnel(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  station_id UUID REFERENCES stations(id),
  last_known_location GEOMETRY(Point, 4326),
  status TEXT DEFAULT 'active' CHECK(status IN('active','in_transit','emergency')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE assets(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  station_id UUID REFERENCES stations(id),
  maintenance_status TEXT DEFAULT 'ok' CHECK(maintenance_status IN('ok','due','under_repair')),
  last_serviced_at DATE
);

-- DEMO DEVIATION (extension): voyages carry optimizer capacities + station FKs
CREATE TABLE voyages(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  departure_station TEXT,
  arrival_station TEXT,
  departure_station_id UUID REFERENCES stations(id),
  arrival_station_id UUID REFERENCES stations(id),
  departure_date DATE,
  arrival_date DATE,
  route GEOMETRY(LineString, 4326),
  weight_capacity_kg NUMERIC NOT NULL DEFAULT 20000,
  volume_capacity_m3 NUMERIC NOT NULL DEFAULT 120
);

-- DEMO DEVIATION (extension): lifecycle status + asset link (maintenance-linked loading rule)
CREATE TABLE cargo_items(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  weight_kg NUMERIC,
  volume_m3 NUMERIC,
  priority INT DEFAULT 3,
  quantity NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_inventory' CHECK(status IN('in_inventory','reserved','shipped','delivered')),
  station_id UUID REFERENCES stations(id),
  voyage_id UUID REFERENCES voyages(id),
  asset_id UUID REFERENCES assets(id),
  box_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consumption_events(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_item_id UUID REFERENCES cargo_items(id),
  quantity_used NUMERIC NOT NULL,
  logged_by UUID REFERENCES personnel(id),
  logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE emergency_events(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID REFERENCES personnel(id),
  station_id UUID REFERENCES stations(id),
  status TEXT DEFAULT 'open' CHECK(status IN('open','acknowledged','escalated','resolved')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE indents(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID REFERENCES personnel(id),
  cargo_item_id UUID REFERENCES cargo_items(id),
  quantity_requested NUMERIC,
  status TEXT DEFAULT 'pending' CHECK(status IN('pending','approved','rejected','fulfilled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hash-chained, append-only audit log — never UPDATE or DELETE rows here.
CREATE TABLE audit_log(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  payload JSONB,
  prev_hash TEXT,
  row_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cargo_station ON cargo_items(station_id);
CREATE INDEX idx_personnel_station ON personnel(station_id);
CREATE INDEX idx_emergency_status ON emergency_events(status);
CREATE INDEX idx_consumption_item ON consumption_events(cargo_item_id, logged_at);