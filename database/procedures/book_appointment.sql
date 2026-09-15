-- =============================================================================
-- MediBook Stored Procedure: book_appointment
-- Database: medibook_sql
-- Language: MySQL Procedural SQL (Not PL/SQL - PL/SQL is Oracle-specific)
-- =============================================================================
-- Purpose:
--   Executes atomic appointment booking within a single MySQL database transaction,
--   enforcing row-level locking (SELECT ... FOR UPDATE) and constraint validation.
--
-- Parameters:
--   IN p_patient_id BIGINT UNSIGNED : ID of the existing patient
--   IN p_slot_id    BIGINT UNSIGNED : ID of the available appointment slot
--
-- Validation & Error Handling:
--   1. Validates p_patient_id exists in `patients`. Raises error if missing.
--   2. Locks & validates p_slot_id exists in `appointment_slots`. Raises error if missing.
--   3. Validates slot is available (is_booked = 0). Raises error if already booked.
--   4. Inserts booking record with status 'CONFIRMED'.
--   5. Updates appointment_slots.is_booked = 1.
--   6. ROLLBACK on any SQLEXCEPTION; COMMIT on success.
-- =============================================================================

USE medibook_sql;

DROP PROCEDURE IF EXISTS book_appointment;

DELIMITER //

CREATE PROCEDURE book_appointment(
    IN p_patient_id BIGINT UNSIGNED,
    IN p_slot_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_is_booked TINYINT(1);

    -- Exception Handler: Automatic Rollback & Exception Propagation
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Start Atomic Transaction
    START TRANSACTION;

    -- 1. Patient Validation: Verify patient exists in `patients` table
    IF NOT EXISTS (SELECT 1 FROM patients WHERE id = p_patient_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Patient not found';
    END IF;

    -- 2. Slot Validation & Row Locking: Retrieve and lock requested slot row
    SELECT is_booked INTO v_is_booked
    FROM appointment_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF v_is_booked IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Appointment slot not found';
    END IF;

    -- 3. Availability Check: Reject if slot is already booked
    IF v_is_booked = 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Appointment slot is already booked';
    END IF;

    -- 4. Booking Creation: Insert confirmed booking record
    INSERT INTO bookings (slot_id, patient_id, status, expires_at)
    VALUES (p_slot_id, p_patient_id, 'CONFIRMED', NULL);

    -- 5. Slot State Update: Mark slot as booked
    UPDATE appointment_slots
    SET is_booked = 1
    WHERE id = p_slot_id;

    -- Commit Transaction
    COMMIT;
END //

DELIMITER ;
