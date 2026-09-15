-- =============================================================================
-- Report 3: Patient Appointment Activity & History Report
-- Purpose: Identifies top patients by total booking attempts, confirmed visits,
--          failed booking attempts, and date of most recent booking.
-- Tables Used: patients, bookings
-- SQL Concepts: INNER JOIN, GROUP BY, COUNT, SUM(CASE ...), MAX, HAVING
-- Read-Only Query
-- =============================================================================

USE medibook_sql;

SELECT 
    p.id AS patient_id,
    p.name AS patient_name,
    COUNT(b.id) AS total_booking_attempts,
    SUM(CASE WHEN b.status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_appointments,
    SUM(CASE WHEN b.status = 'FAILED' THEN 1 ELSE 0 END) AS failed_appointments,
    MAX(b.created_at) AS last_booking_date
FROM patients p
INNER JOIN bookings b ON p.id = b.patient_id
GROUP BY p.id, p.name
HAVING total_booking_attempts >= 1
ORDER BY confirmed_appointments DESC, total_booking_attempts DESC;
