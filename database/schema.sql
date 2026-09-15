-- =============================================================================
-- MediBook MySQL Database Schema Definition
-- Database: medibook_sql
-- Engine: InnoDB
-- Character Set: utf8mb4 (utf8mb4_unicode_ci)
-- =============================================================================
-- Setup Instructions:
-- 1. Connect to MySQL server: mysql -u <username> -p
-- 2. Execute schema initialization:
--    CREATE DATABASE IF NOT EXISTS medibook_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--    USE medibook_sql;
-- 3. Run this script:
--    mysql -u <username> -p medibook_sql < database/schema.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS medibook_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook_sql;

-- -----------------------------------------------------------------------------
-- 1. DOCTORS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doctors_specialization (specialization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. PATIENTS TABLE (Normalized Patient Master Entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_patients_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. APPOINTMENT SLOTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_slots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    doctor_id BIGINT UNSIGNED NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    is_booked TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    CONSTRAINT uk_doctor_date_time UNIQUE (doctor_id, slot_date, slot_time),
    INDEX idx_slots_doctor_booked (doctor_id, is_booked),
    INDEX idx_slots_date (slot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. BOOKINGS TABLE (With Database-Level Double Booking Protection)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slot_id BIGINT UNSIGNED NOT NULL,
    patient_id BIGINT UNSIGNED NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active_slot_id BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN status IN ('PENDING', 'CONFIRMED') THEN slot_id ELSE NULL END
    ) VIRTUAL,
    CONSTRAINT fk_bookings_slot FOREIGN KEY (slot_id) REFERENCES appointment_slots(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
    CONSTRAINT uk_active_slot_booking UNIQUE (active_slot_id),
    INDEX idx_bookings_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
