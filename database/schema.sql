-- =============================================================================
-- MediBook 2.0 MySQL Database Schema Definition
-- Database: medibook_sql
-- Engine: InnoDB
-- Character Set: utf8mb4 (utf8mb4_unicode_ci)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS medibook_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook_sql;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE (Authentication Account Master)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    login_id VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('PATIENT', 'DOCTOR', 'ADMIN') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_login_id (login_id),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. DOCTORS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL UNIQUE,
    doctor_code VARCHAR(20) NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_doctors_specialization (specialization),
    INDEX idx_doctors_code (doctor_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. PATIENTS TABLE (Normalized Patient Master Entity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL UNIQUE,
    patient_code VARCHAR(20) NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patients_name (name),
    INDEX idx_patients_code (patient_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. APPOINTMENT SLOTS TABLE
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
-- 5. BOOKINGS TABLE (With Database-Level Double Booking Protection)
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

-- -----------------------------------------------------------------------------
-- 6. TESTS TABLE (Clinical Test Catalog)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    test_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tests_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. APPOINTMENT_TESTS TABLE (Suggested Clinical Tests per Appointment)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_tests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    test_id BIGINT UNSIGNED NOT NULL,
    instructions TEXT NULL,
    status ENUM('SUGGESTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SUGGESTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_tests_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_tests_test FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE RESTRICT,
    CONSTRAINT uk_booking_test UNIQUE (booking_id, test_id),
    INDEX idx_appt_tests_booking (booking_id),
    INDEX idx_appt_tests_test (test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. TEST_RESULTS TABLE (Text-Based Clinical Results)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    appointment_test_id BIGINT UNSIGNED NOT NULL UNIQUE,
    result_value TEXT NOT NULL,
    notes TEXT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_results_appt_test FOREIGN KEY (appointment_test_id) REFERENCES appointment_tests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. PRESCRIPTIONS TABLE (Digital Prescription Header)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescriptions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_prescriptions_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. PRESCRIPTION_ITEMS TABLE (Medication Details)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescription_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT UNSIGNED NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT NULL,
    CONSTRAINT fk_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    INDEX idx_prescription_items_rx (prescription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
