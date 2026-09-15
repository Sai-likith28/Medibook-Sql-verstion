const bcrypt = require('bcryptjs');

/**
 * DEVELOPMENT & SETUP MIGRATION HELPER (Phase 10B — MediBook 2.0)
 * -----------------------------------------------------------------------------
 * INTENT & SCOPE:
 * This module performs idempotent schema initialization and development seed setup
 * during local application startup.
 *
 * MIGRATION SAFETY RULES:
 * 1. IDEMPOTENCY: All operations use `CREATE TABLE IF NOT EXISTS`, check for column existence,
 *    or check row counts before inserting.
 * 2. NON-DESTRUCTIVE: This helper NEVER issues `DROP TABLE`, `TRUNCATE`, or `DELETE` statements.
 * 3. PRODUCTION NOTICE: In production environments, database migrations must be executed
 *    using controlled, versioned migration tools (e.g. Knex, Liquibase, Flyway) rather than
 *    auto-migrating on application startup.
 * 4. SEED CREDENTIALS: The seed accounts below (admin/admin123, D-000001/doctor123, P-000001/patient123)
 *    are DEVELOPMENT/DEMO CREDENTIALS ONLY. Production deployments MUST replace or disable them.
 * 5. PASSWORDS: All passwords are hashed using bcrypt before SQL insertion. Plaintext passwords are NEVER stored.
 */
async function ensurePhase10bSchema(pool) {
    // Skip or log notice if in production
    if (process.env.NODE_ENV === 'production') {
        console.log('[Notice] Skipping automatic startup migration in production environment.');
        return;
    }

    // 1. Create `users` table if not exists
    await pool.query(`
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
    `);

    // 2. Extend `doctors` table if columns missing
    const [doctorCols] = await pool.query("SHOW COLUMNS FROM doctors LIKE 'user_id'");
    if (doctorCols.length === 0) {
        await pool.query(`
            ALTER TABLE doctors
                ADD COLUMN user_id BIGINT UNSIGNED NULL UNIQUE AFTER id,
                ADD COLUMN doctor_code VARCHAR(20) NULL UNIQUE AFTER user_id,
                ADD COLUMN email VARCHAR(255) NULL AFTER specialization,
                ADD CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        `);
    }

    // 3. Extend `patients` table if columns missing
    const [patientCols] = await pool.query("SHOW COLUMNS FROM patients LIKE 'user_id'");
    if (patientCols.length === 0) {
        await pool.query(`
            ALTER TABLE patients
                ADD COLUMN user_id BIGINT UNSIGNED NULL UNIQUE AFTER id,
                ADD COLUMN patient_code VARCHAR(20) NULL UNIQUE AFTER user_id,
                ADD COLUMN phone VARCHAR(50) NULL AFTER name,
                ADD COLUMN email VARCHAR(255) NULL AFTER phone,
                ADD CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        `);
    }

    // 4. Create `tests` catalog table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS tests (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            test_code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tests_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create `appointment_tests` table
    await pool.query(`
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
    `);

    // 6. Create `test_results` table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS test_results (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            appointment_test_id BIGINT UNSIGNED NOT NULL UNIQUE,
            result_value TEXT NOT NULL,
            notes TEXT NULL,
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_results_appt_test FOREIGN KEY (appointment_test_id) REFERENCES appointment_tests(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Create `prescriptions` table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS prescriptions (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_prescriptions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            INDEX idx_prescriptions_booking (booking_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Create `prescription_items` table
    await pool.query(`
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
    `);

    // 9. Seed default clinical test catalog entries if empty
    const [testRows] = await pool.query("SELECT COUNT(*) AS count FROM tests");
    if (testRows[0].count === 0) {
        await pool.query(`
            INSERT INTO tests (test_code, name, category, description) VALUES
            ('TEST-CBC', 'Complete Blood Count (CBC)', 'Hematology', 'Evaluates overall health and detects disorders such as anemia and infection.'),
            ('TEST-GLU', 'Fasting Blood Glucose', 'Biochemistry', 'Measures blood sugar levels to screen for diabetes.'),
            ('TEST-THY', 'Thyroid Stimulating Hormone (TSH)', 'Endocrinology', 'Assesses thyroid gland activity and function.'),
            ('TEST-LIP', 'Lipid Panel Profile', 'Cardiology', 'Measures cholesterol and triglyceride levels to assess cardiovascular risk.')
        `);
    }

    // 10. Seed Admin Account if missing (DEVELOPMENT ONLY: admin / admin123)
    const [adminRows] = await pool.query("SELECT id FROM users WHERE login_id = 'admin'");
    if (adminRows.length === 0) {
        const adminHash = bcrypt.hashSync('admin123', 10);
        await pool.query("INSERT INTO users (login_id, password_hash, role) VALUES ('admin', ?, 'ADMIN')", [adminHash]);
    }

    // 11. Sync Doctor Accounts (Assign D-XXXXXX codes & create user accounts: D-000001 / doctor123)
    const [doctors] = await pool.query("SELECT id, name, user_id, doctor_code FROM doctors");
    for (const doc of doctors) {
        const docCode = doc.doctor_code || `D-${String(doc.id).padStart(6, '0')}`;
        let userId = doc.user_id;

        if (!userId) {
            const [existingUser] = await pool.query("SELECT id FROM users WHERE login_id = ?", [docCode]);
            if (existingUser.length > 0) {
                userId = existingUser[0].id;
            } else {
                const docHash = bcrypt.hashSync('doctor123', 10);
                const [userRes] = await pool.query(
                    "INSERT INTO users (login_id, password_hash, role) VALUES (?, ?, 'DOCTOR')",
                    [docCode, docHash]
                );
                userId = userRes.insertId;
            }
            await pool.query(
                "UPDATE doctors SET user_id = ?, doctor_code = ? WHERE id = ?",
                [userId, docCode, doc.id]
            );
        }
    }

    // 12. Sync Patient Accounts (Assign P-XXXXXX codes & create user accounts: P-000001 / patient123)
    const [patients] = await pool.query("SELECT id, name, user_id, patient_code FROM patients");
    for (const pat of patients) {
        const patCode = pat.patient_code || `P-${String(pat.id).padStart(6, '0')}`;
        let userId = pat.user_id;

        if (!userId) {
            const [existingUser] = await pool.query("SELECT id FROM users WHERE login_id = ?", [patCode]);
            if (existingUser.length > 0) {
                userId = existingUser[0].id;
            } else {
                const patHash = bcrypt.hashSync('patient123', 10);
                const [userRes] = await pool.query(
                    "INSERT INTO users (login_id, password_hash, role) VALUES (?, ?, 'PATIENT')",
                    [patCode, patHash]
                );
                userId = userRes.insertId;
            }
            await pool.query(
                "UPDATE patients SET user_id = ?, patient_code = ? WHERE id = ?",
                [userId, patCode, pat.id]
            );
        }
    }
}

module.exports = { ensurePhase10bSchema };
