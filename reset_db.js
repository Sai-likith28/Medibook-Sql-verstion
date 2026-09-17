const pool = require('./src/config/mysql');
const bcrypt = require('bcryptjs');

async function resetDevelopmentDatabase() {
    console.log('==================================================');
    console.log('RESETTING DEVELOPMENT MYSQL DATABASE (medibook_sql)');
    console.log('==================================================');

    try {
        // 1. Confirm database connection & schema name
        const [dbNameResult] = await pool.query('SELECT DATABASE() as dbName');
        const currentDb = dbNameResult[0].dbName;
        console.log(`[Configured DB Target]: ${currentDb}`);

        if (currentDb !== 'medibook_sql') {
            console.error(`[SAFETY CHECK FAILED] Expected database 'medibook_sql' but connected to '${currentDb}'. Aborting.`);
            process.exit(1);
        }

        // 2. Disable foreign key checks for clean truncation
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Clearing development application tables...');
        const tables = [
            'booking_audit',
            'test_results',
            'appointment_tests',
            'prescription_items',
            'prescriptions',
            'bookings',
            'appointment_slots',
            'patients',
            'doctors',
            'users',
            'tests'
        ];

        for (const table of tables) {
            await pool.query(`TRUNCATE TABLE ${table}`);
            console.log(` - Truncated table: ${table}`);
        }

        // Re-enable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ All development tables cleared successfully while preserving schema structure.');

        // 3. Seed Initial Clean Generic Fictional Data
        console.log('\nSeeding initial clean generic fictional test data...');

        // Tests catalog
        await pool.query(`
            INSERT INTO tests (test_code, name, category, description) VALUES
            ('TEST-CBC', 'Complete Blood Count (CBC)', 'Hematology', 'Evaluates overall health and detects disorders such as anemia and infection.'),
            ('TEST-GLU', 'Fasting Blood Glucose', 'Biochemistry', 'Measures blood sugar levels to screen for diabetes.'),
            ('TEST-THY', 'Thyroid Stimulating Hormone (TSH)', 'Endocrinology', 'Assesses thyroid gland activity and function.'),
            ('TEST-LIP', 'Lipid Panel Profile', 'Cardiology', 'Measures cholesterol and triglyceride levels to assess cardiovascular risk.')
        `);
        console.log(' - Seeded 4 clinical tests catalog entries');

        // Admin 1
        const adminHash = bcrypt.hashSync('admin123', 10);
        const [adminRes] = await pool.query(
            "INSERT INTO users (login_id, password_hash, role, status) VALUES ('admin', ?, 'ADMIN', 'ACTIVE')",
            [adminHash]
        );
        console.log(` - Seeded Admin 1 (login_id: admin)`);

        // Doctor 1 & Doctor 2
        const docHash = bcrypt.hashSync('doctor123', 10);
        
        // Doctor 1
        const [uDoc1] = await pool.query(
            "INSERT INTO users (login_id, password_hash, role, status) VALUES ('D-000001', ?, 'DOCTOR', 'ACTIVE')",
            [docHash]
        );
        await pool.query(
            "INSERT INTO doctors (id, user_id, doctor_code, name, specialization, email) VALUES (1, ?, 'D-000001', 'Doctor 1', 'General Practice', 'doctor1@example.test')",
            [uDoc1.insertId]
        );
        console.log(` - Seeded Doctor 1 (D-000001 / doctor123)`);

        // Doctor 2
        const [uDoc2] = await pool.query(
            "INSERT INTO users (login_id, password_hash, role, status) VALUES ('D-000002', ?, 'DOCTOR', 'ACTIVE')",
            [docHash]
        );
        await pool.query(
            "INSERT INTO doctors (id, user_id, doctor_code, name, specialization, email) VALUES (2, ?, 'D-000002', 'Doctor 2', 'Diagnostics', 'doctor2@example.test')",
            [uDoc2.insertId]
        );
        console.log(` - Seeded Doctor 2 (D-000002 / doctor123)`);

        // Patient 1 & Patient 2
        const patHash = bcrypt.hashSync('patient123', 10);

        // Patient 1
        const [uPat1] = await pool.query(
            "INSERT INTO users (login_id, password_hash, role, status) VALUES ('P-000001', ?, 'PATIENT', 'ACTIVE')",
            [patHash]
        );
        await pool.query(
            "INSERT INTO patients (id, user_id, patient_code, name, phone, email) VALUES (1, ?, 'P-000001', 'Patient 1', '555-0101', 'patient1@example.test')",
            [uPat1.insertId]
        );
        console.log(` - Seeded Patient 1 (P-000001 / patient123)`);

        // Patient 2
        const [uPat2] = await pool.query(
            "INSERT INTO users (login_id, password_hash, role, status) VALUES ('P-000002', ?, 'PATIENT', 'ACTIVE')",
            [patHash]
        );
        await pool.query(
            "INSERT INTO patients (id, user_id, patient_code, name, phone, email) VALUES (2, ?, 'P-000002', 'Patient 2', '555-0102', 'patient2@example.test')",
            [uPat2.insertId]
        );
        console.log(` - Seeded Patient 2 (P-000002 / patient123)`);

        console.log('\n==================================================');
        console.log('RESET & SEED COMPLETED SUCCESSFULLY');
        console.log('==================================================');
        process.exit(0);

    } catch (err) {
        console.error('Error during database reset:', err);
        process.exit(1);
    }
}

resetDevelopmentDatabase();
