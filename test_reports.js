const fs = require('fs');
const path = require('path');
const pool = require('./src/config/mysql');

async function runReportVerification() {
    console.log('=== STARTING SQL REPORTING LAYER VERIFICATION (Step 7) ===\n');

    const reports = [
        { name: 'Report 1: Doctor Utilization & Performance', file: 'doctor_utilization.sql' },
        { name: 'Report 2: Daily Appointment Summary', file: 'daily_summary.sql' },
        { name: 'Report 3: Patient Activity & History', file: 'patient_activity.sql' },
        { name: 'Report 4: Peak Booking Time Distribution', file: 'peak_booking_time.sql' },
        { name: 'Report 5: Specialization Capacity & Demand', file: 'specialization_demand.sql' },
        { name: 'Report 6: Booking Audit Lifecycle Metric', file: 'booking_audit_lifecycle.sql' }
    ];

    const conn = await pool.getConnection();

    try {
        // 1. Seed representative dataset for meaningful report output
        console.log('[Setup] Seeding representative dataset for reporting test...');
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE booking_audit');
        await conn.query('TRUNCATE TABLE bookings');
        await conn.query('TRUNCATE TABLE appointment_slots');
        await conn.query('TRUNCATE TABLE patients');
        await conn.query('TRUNCATE TABLE doctors');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        // Insert Doctors
        const [doc1] = await conn.query('INSERT INTO doctors (name, specialization) VALUES ("Dr. Alice Smith", "Cardiology")');
        const [doc2] = await conn.query('INSERT INTO doctors (name, specialization) VALUES ("Dr. Bob Jones", "Pediatrics")');
        const [doc3] = await conn.query('INSERT INTO doctors (name, specialization) VALUES ("Dr. Clara Oswald", "Diagnostics")');

        // Insert Patients
        const [pat1] = await conn.query('INSERT INTO patients (name) VALUES ("John Doe")');
        const [pat2] = await conn.query('INSERT INTO patients (name) VALUES ("Jane Miller")');
        const [pat3] = await conn.query('INSERT INTO patients (name) VALUES ("Sam Wilson")');

        // Insert Slots
        const today = new Date().toISOString().split('T')[0];
        const [s1] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, "09:00:00", 1)', [doc1.insertId, today]);
        const [s2] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, "10:30:00", 0)', [doc1.insertId, today]);
        const [s3] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, "14:00:00", 1)', [doc2.insertId, today]);
        const [s4] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, "15:30:00", 0)', [doc2.insertId, today]);
        const [s5] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, "17:00:00", 1)', [doc3.insertId, today]);

        // Insert Bookings & Audit entries
        // Booking 1: Confirmed
        const [b1] = await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")', [s1.insertId, pat1.insertId]);
        await conn.query('INSERT INTO booking_audit (booking_id, old_status, new_status, action) VALUES (?, NULL, "CONFIRMED", "INSERT")', [b1.insertId]);

        // Booking 2: Failed
        const [b2] = await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "FAILED")', [s2.insertId, pat2.insertId]);
        await conn.query('INSERT INTO booking_audit (booking_id, old_status, new_status, action) VALUES (?, NULL, "PENDING", "INSERT")', [b2.insertId]);
        await conn.query('INSERT INTO booking_audit (booking_id, old_status, new_status, action) VALUES (?, "PENDING", "FAILED", "UPDATE")', [b2.insertId]);

        // Booking 3: Confirmed
        const [b3] = await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")', [s3.insertId, pat2.insertId]);
        await conn.query('INSERT INTO booking_audit (booking_id, old_status, new_status, action) VALUES (?, NULL, "CONFIRMED", "INSERT")', [b3.insertId]);

        // Booking 4: Confirmed
        const [b4] = await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")', [s5.insertId, pat3.insertId]);
        await conn.query('INSERT INTO booking_audit (booking_id, old_status, new_status, action) VALUES (?, NULL, "CONFIRMED", "INSERT")', [b4.insertId]);

        console.log('[Setup] Seeded representative data successfully.\n');

        // 2. Execute each report SQL file
        for (const r of reports) {
            console.log(`\n==================================================`);
            console.log(`EXECUTING: ${r.name}`);
            console.log(`File: database/reports/${r.file}`);
            console.log(`==================================================`);

            const sqlPath = path.join(__dirname, 'database', 'reports', r.file);
            let rawSql = fs.readFileSync(sqlPath, 'utf8');

            // Strip USE database statement if present for query execution
            const cleanedQuery = rawSql.replace(/^USE\s+\w+;/im, '').trim();

            const [rows] = await conn.query(cleanedQuery);
            console.log(`Status: SUCCESS (Returned ${rows.length} rows)\nOutput:`);
            console.table(rows);
        }

        // 3. Division-by-Zero & Empty Table Safety Test
        console.log('\n==================================================');
        console.log('TESTING EMPTY TABLE & DIVISION-BY-ZERO SAFETY');
        console.log('==================================================');

        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE booking_audit');
        await conn.query('TRUNCATE TABLE bookings');
        await conn.query('TRUNCATE TABLE appointment_slots');
        await conn.query('TRUNCATE TABLE patients');
        await conn.query('TRUNCATE TABLE doctors');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        for (const r of reports) {
            const sqlPath = path.join(__dirname, 'database', 'reports', r.file);
            let rawSql = fs.readFileSync(sqlPath, 'utf8');
            const cleanedQuery = rawSql.replace(/^USE\s+\w+;/im, '').trim();

            const [rows] = await conn.query(cleanedQuery);
            console.log(`[Empty Table Safety] ${r.file}: Executed cleanly without division-by-zero error (Rows returned: ${rows.length}).`);
        }

        console.log('\n=== ALL SQL REPORTING LAYER VERIFICATION TESTS PASSED SUCCESSFULLY! ===');

    } catch (err) {
        console.error('\n!!! REPORT VERIFICATION FAILED !!!', err);
        process.exit(1);
    } finally {
        conn.release();
        process.exit(0);
    }
}

runReportVerification();
