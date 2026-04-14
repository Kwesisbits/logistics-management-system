-- Run once if Flyway reported a failed migration for V7 (e.g. old roles_name_check).
-- Example (adjust host/user/password):
--   psql -h localhost -U postgres -d logistics_identity_db -f scripts/clear-failed-flyway-v7-identity.sql
DELETE FROM flyway_schema_history WHERE version = '7' AND success = false;
