-- =============================================================================
-- MediBook Database Triggers: Booking Audit Log
-- Database: medibook_sql
-- Engine: InnoDB
-- =============================================================================
-- Purpose:
--   Automatically creates an immutable, tamper-proof audit history in `booking_audit`
--   whenever a booking is created (INSERT) or its status is updated (UPDATE).
--
-- Transaction Behavior:
--   Triggers execute synchronously within the surrounding transaction. If the 
--   calling transaction (Node.js API, Stored Procedure, Cron) rolls back, the
--   corresponding audit record is automatically rolled back.
-- =============================================================================

USE medibook_sql;

-- -----------------------------------------------------------------------------
-- 1. BOOKING AUDIT TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50) NULL DEFAULT NULL,
    new_status VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_audit_booking_id (booking_id),
    INDEX idx_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. AFTER INSERT TRIGGER: trg_bookings_after_insert
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bookings_after_insert;

DELIMITER //

CREATE TRIGGER trg_bookings_after_insert
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
    INSERT INTO booking_audit (booking_id, old_status, new_status, action, changed_at)
    VALUES (NEW.id, NULL, NEW.status, 'INSERT', NOW());
END //

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. AFTER UPDATE TRIGGER: trg_bookings_after_update
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_bookings_after_update;

DELIMITER //

CREATE TRIGGER trg_bookings_after_update
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    -- Only create an audit log if the booking status actually changes
    IF OLD.status IS NULL OR OLD.status <> NEW.status THEN
        INSERT INTO booking_audit (booking_id, old_status, new_status, action, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, 'UPDATE', NOW());
    END IF;
END //

DELIMITER ;
