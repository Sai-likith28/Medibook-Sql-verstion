-- =============================================================================
-- Report 6: Booking Audit Lifecycle & Status Transition Metric Report
-- Purpose: Queries the booking_audit log table to measure status change event
--          frequencies (INSERT, PENDING -> FAILED, PENDING -> CONFIRMED),
--          auditing system stability and transaction lifecycle events.
-- Tables Used: booking_audit
-- SQL Concepts: Subquery ratio calculation, COALESCE, GROUP BY, COUNT, ROUND
-- Read-Only Query
-- =============================================================================

USE medibook_sql;

SELECT 
    ba.action AS audit_action,
    COALESCE(ba.old_status, 'N/A (Initial Creation)') AS previous_status,
    ba.new_status,
    COUNT(ba.id) AS total_events,
    ROUND(
        (COUNT(ba.id) / NULLIF((SELECT COUNT(*) FROM booking_audit), 0)) * 100, 
        2
    ) AS pct_of_total_events
FROM booking_audit ba
GROUP BY ba.action, ba.old_status, ba.new_status
ORDER BY total_events DESC;
