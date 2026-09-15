-- =============================================================================
-- Report 1: Doctor Utilization & Performance Report
-- Purpose: Evaluates schedule capacity, confirmed bookings, failed bookings,
--          available slots, and overall schedule utilization rate per doctor.
-- Tables Used: doctors, appointment_slots, bookings
-- SQL Concepts: LEFT JOIN, GROUP BY, COUNT(DISTINCT), SUM, CASE, NULLIF, ROUND
-- Read-Only Query
-- =============================================================================

USE medibook_sql;

SELECT 
    d.id AS doctor_id,
    d.name AS doctor_name,
    d.specialization,
    COUNT(DISTINCT s.id) AS total_slots,
    COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) AS confirmed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'FAILED' THEN b.id END) AS failed_bookings,
    SUM(CASE WHEN s.is_booked = 0 THEN 1 ELSE 0 END) AS available_slots,
    ROUND(
        (COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100, 
        2
    ) AS utilization_rate_pct
FROM doctors d
LEFT JOIN appointment_slots s ON d.id = s.doctor_id
LEFT JOIN bookings b ON s.id = b.slot_id
GROUP BY d.id, d.name, d.specialization
ORDER BY utilization_rate_pct DESC, total_slots DESC;
