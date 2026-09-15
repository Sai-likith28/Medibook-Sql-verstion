-- =============================================================================
-- Report 2: Daily Appointment & Booking Demand Summary
-- Purpose: Tracks daily appointment volume and booking status over a rolling
--          ±30-day window to evaluate scheduling demand and confirmation rates.
-- Tables Used: appointment_slots, bookings
-- SQL Concepts: Date range filtering (CURDATE ± 30 DAY), LEFT JOIN, GROUP BY,
--               COUNT, CASE, NULLIF, ROUND
-- Read-Only Query
-- =============================================================================

USE medibook_sql;

SELECT 
    s.slot_date AS appointment_date,
    COUNT(DISTINCT s.id) AS total_slots,
    COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) AS confirmed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'FAILED' THEN b.id END) AS failed_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'PENDING' THEN b.id END) AS pending_bookings,
    ROUND(
        (COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.id END) / NULLIF(COUNT(DISTINCT s.id), 0)) * 100,
        2
    ) AS confirmation_rate_pct
FROM appointment_slots s
LEFT JOIN bookings b ON s.id = b.slot_id
WHERE s.slot_date BETWEEN CURDATE() - INTERVAL 30 DAY AND CURDATE() + INTERVAL 30 DAY
GROUP BY s.slot_date
ORDER BY s.slot_date ASC;
