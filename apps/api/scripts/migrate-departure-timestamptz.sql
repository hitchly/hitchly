-- Convert trip / recurring schedule instants to timestamptz.
-- Run once on Postgres (Neon SQL editor, psql, etc.) with Drizzle schema using withTimezone: true.
--
-- Assumes existing naive timestamps were written as UTC wall times (typical Node + pg).
BEGIN;

ALTER TABLE trips
  ALTER COLUMN departure_time TYPE timestamptz
  USING departure_time AT TIME ZONE 'UTC';

ALTER TABLE recurring_trip_schedules
  ALTER COLUMN effective_from TYPE timestamptz
  USING effective_from AT TIME ZONE 'UTC';

ALTER TABLE recurring_trip_schedules
  ALTER COLUMN effective_to TYPE timestamptz
  USING effective_to AT TIME ZONE 'UTC';

COMMIT;
