-- Optional database cleanup after removing appointment scheduling from the app.
-- Run this only after taking a fresh database backup.
-- The application code no longer mounts appointment, advisor availability, or appointment reminder APIs.

DROP TABLE IF EXISTS appointment_reminders;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS advisor_time_off;
DROP TABLE IF EXISTS advisor_availability;

-- company_engagement_summary.appointment_count is intentionally left in place for backward-compatible reports/history.
-- Current backend writes this metric as 0 after the scheduling module removal.
