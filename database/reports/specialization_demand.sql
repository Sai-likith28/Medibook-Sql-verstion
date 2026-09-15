-- =============================================================================
-- Report 5: Specialization Capacity & Demand Breakdown
-- Purpose: Aggregates scheduling capacity, confirmed visits, failed attempts,
--          and fill rates at the medical specialization / department level.
-- Tables Used: doctors, appointment_slots, bookings
-- SQL Concepts: Multi-table LEFT JOIN, GROUP BY, COUNT(DISTINCT), ROUND, NULLIF
-- Read-Only Query
-- =============================================================================

USE medibook_sql;

SELECT 
    d.specialization,
    COUNT(DISTINCT d.id) AS doctor_count,
    COUNT(DISTINCT s.id) AS total_department_slots,
    COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) AS confirmed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'FAILED' THEN b.id END) AS failed_bookings,
    ROUND(
        (COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100,
        2
    ) AS department_fill_rate_pct
FROM doctors d
LEFT JOIN appointment_slots s ON d.id = s.doctor_id
LEFT JOIN bookings b ON s.id = b.slot_id
GROUP BY d.specialization
ORDER BY department_fill_rate_pct DESC, total_department_slots DESC;
