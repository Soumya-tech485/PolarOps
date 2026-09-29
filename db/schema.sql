-- ============================================================================
-- PolarOps — FINAL consolidated schema (SIH26062) — CANONICAL, FROZEN
-- Rule: audit_log is append-only. NEVER UPDATE OR DELETE rows in it.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('station', 'logistics', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code               TEXT UNIQUE NOT NULL,
    name               TEXT NOT NULL,
    geom               geometry(Point, 4326),
    next_resupply_date DATE
);

CREATE TABLE personnel (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name        TEXT NOT NULL,
    role_title       TEXT,
    station_id       UUID REFERENCES stations(id) ON DELETE SET NULL,
    status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'in_transit', 'emergency')),
    last_location    TEXT,
    last_update      TIMESTAMPTZ,
    clearance_expiry DATE
);
CREATE INDEX idx_personnel_station ON personnel(station_id);

CREATE TABLE voyages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route       TEXT[] NOT NULL,
    depart_date DATE,
    arrive_date DATE,
    status      TEXT NOT NULL DEFAULT 'planned',
    capacity_kg NUMERIC,
    capacity_m3 NUMERIC,
    delay_days  INT NOT NULL DEFAULT 0
);

CREATE TABLE voyage_assignments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voyage_id     UUID NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
    personnel_id  UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    role_on_board TEXT,
    assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (voyage_id, personnel_id)
);

CREATE TABLE assets (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial           TEXT UNIQUE NOT NULL,
    name             TEXT NOT NULL,
    station_id       UUID REFERENCES stations(id) ON DELETE SET NULL,
    status           TEXT,
    maintenance_due  BOOLEAN NOT NULL DEFAULT false,
    next_maintenance DATE
);

CREATE TABLE cargo_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    category   TEXT,
    weight_kg  NUMERIC,
    volume_m3  NUMERIC,
    priority   INT DEFAULT 3,
    quantity   NUMERIC DEFAULT 0,
    station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
    voyage_id  UUID REFERENCES voyages(id) ON DELETE SET NULL,
    asset_id   UUID REFERENCES assets(id) ON DELETE SET NULL,
    box_label  TEXT
);
CREATE INDEX idx_cargo_station ON cargo_items(station_id);
CREATE INDEX idx_cargo_voyage  ON cargo_items(voyage_id);

CREATE TABLE indents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo_item_id UUID NOT NULL REFERENCES cargo_items(id) ON DELETE CASCADE,
    voyage_id     UUID REFERENCES voyages(id) ON DELETE SET NULL,
    requested_qty NUMERIC NOT NULL CHECK (requested_qty > 0),
    status        TEXT NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested','cleared','shipped','received','rejected')),
    qr_token      TEXT,
    stow_position TEXT,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_indents_status ON indents(status);

CREATE TABLE consumption_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo_item_id UUID NOT NULL REFERENCES cargo_items(id) ON DELETE CASCADE,
    quantity      NUMERIC NOT NULL CHECK (quantity > 0),
    consumed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    consumed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes         TEXT
);
CREATE INDEX idx_consumption_item_time ON consumption_events(cargo_item_id, consumed_at);

CREATE TABLE emergency_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    raised_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    raised_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    state      TEXT NOT NULL DEFAULT 'SOS_RAISED',
    payload    JSONB
);

CREATE TABLE audit_log (
    id        BIGSERIAL PRIMARY KEY,
    ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id   UUID,
    action    TEXT NOT NULL,
    entity    TEXT NOT NULL,
    entity_id UUID,
    details   JSONB,
    prev_hash TEXT,
    row_hash  TEXT
);
CREATE INDEX idx_audit_ts ON audit_log(ts);

CREATE TABLE sync_receipts (
    client_uuid UUID PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION block_audit_modification() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only: % operations are forbidden', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_append_only
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION block_audit_modification();