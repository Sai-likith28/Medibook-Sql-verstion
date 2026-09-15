-- =============================================================================
-- Report 4: Peak Booking Time Slot Distribution Analysis
-- Purpose: Categorizes appointment slot demand by hour of the day and time
--          period (Morning, Afternoon, Evening) to identify patient preferences.
-- Tables Used: appointment_slots
-- SQL Concepts: HOUR(), TIME_FORMAT(), CASE interval classification, GROUP BY,
--               SUM, NULLIF, ROUND
-- Read-Only Query
-- =============================================================================

USE medibook_sql;

SELECT 
    CASE 
        WHEN HOUR(s.slot_time) < 12 THEN 'Morning (8 AM - 12 PM)'
        WHEN HOUR(s.slot_time) < 16 THEN 'Afternoon (12 PM - 4 PM)'
        ELSE 'Evening (4 PM - 8 PM)'
    END AS time_window,
    TIME_FORMAT(s.slot_time, '%H:00') AS slot_hour,
    COUNT(s.id) AS total_slots_offered,
    SUM(CASE WHEN s.is_booked = 1 THEN 1 ELSE 0 END) AS total_booked_slots,
    ROUND(
        (SUM(CASE WHEN s.is_booked = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(s.id), 0)) * 100, 
        2
    ) AS booking_fill_rate_pct
FROM appointment_slots s
GROUP BY time_window, HOUR(s.slot_time), TIME_FORMAT(s.slot_time, '%H:00')
ORDER BY HOUR(s.slot_time) ASC;
