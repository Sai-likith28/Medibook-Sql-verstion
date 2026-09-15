const pool = require('./src/config/mysql');

async function runTriggerTests() {
    console.log('=== STARTING MYSQL TRIGGER TESTS (booking_audit) ===\n');

    const conn = await pool.getConnection();

    try {
        // 0. Clean DB tables for clean trigger test run
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE booking_audit');
        await conn.query('TRUNCATE TABLE bookings');
        await conn.query('TRUNCATE TABLE appointment_slots');
        await conn.query('TRUNCATE TABLE patients');
        await conn.query('TRUNCATE TABLE doctors');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('[Setup] Database tables cleared for trigger test run.');

        // Setup Base Data
        const [docRes] = await conn.query('INSERT INTO doctors (name, specialization) VALUES ("Dr. Bruce Banner", "Radiation Health")');
        const doctorId = docRes.insertId;

        const [pat1Res] = await conn.query('INSERT INTO patients (name) VALUES ("Tony Stark")');
        const patient1Id = pat1Res.insertId;

        const [slot1Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-10", "09:00:00", 0)', [doctorId]);
        const slot1Id = slot1Res.insertId;

        // ---------------------------------------------------------------------
        // TEST 1: Booking INSERT Trigger Test
        // ---------------------------------------------------------------------
        console.log('\n[TEST 1] Direct INSERT into bookings...');
        const [book1Res] = await conn.query(
            'INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")',
            [slot1Id, patient1Id]
        );
        const booking1Id = book1Res.insertId;

        const [audit1Rows] = await conn.query(
            'SELECT booking_id, old_status, new_status, action FROM booking_audit WHERE booking_id = ?',
            [booking1Id]
        );

        console.log('Audit records for Booking 1:', audit1Rows);

        if (audit1Rows.length === 1 &&
            audit1Rows[0].action === 'INSERT' &&
            audit1Rows[0].old_status === null &&
            audit1Rows[0].new_status === 'CONFIRMED') {
            console.log('>>> TEST 1 PASSED: trg_bookings_after_insert logged INSERT audit row.');
        } else {
            throw new Error('TEST 1 FAILED: Incorrect INSERT audit row');
        }

        // ---------------------------------------------------------------------
        // TEST 2 & 3: Booking UPDATE & No-Op UPDATE Trigger Test
        // ---------------------------------------------------------------------
        console.log('\n[TEST 2 & 3] Status Update & No-Op Update Tests...');
        const [slot2Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-10", "10:00:00", 0)', [doctorId]);
        const slot2Id = slot2Res.insertId;

        const [book2Res] = await conn.query(
            'INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "PENDING")',
            [slot2Id, patient1Id]
        );
        const booking2Id = book2Res.insertId;

        // Execute status change: PENDING -> FAILED
        await conn.query('UPDATE bookings SET status = "FAILED" WHERE id = ?', [booking2Id]);

        const [audit2Rows] = await conn.query(
            'SELECT booking_id, old_status, new_status, action FROM booking_audit WHERE booking_id = ? AND action = "UPDATE"',
            [booking2Id]
        );

        console.log('Audit records for Booking 2 status change:', audit2Rows);

        if (audit2Rows.length === 1 &&
            audit2Rows[0].old_status === 'PENDING' &&
            audit2Rows[0].new_status === 'FAILED') {
            console.log('>>> TEST 2 PASSED: trg_bookings_after_update logged PENDING -> FAILED transition.');
        } else {
            throw new Error('TEST 2 FAILED: Incorrect UPDATE audit row');
        }

        // Execute No-Op update: FAILED -> FAILED
        console.log('Executing No-Op status update (FAILED -> FAILED)...');
        await conn.query('UPDATE bookings SET status = "FAILED" WHERE id = ?', [booking2Id]);

        const [audit2NoOpRows] = await conn.query(
            'SELECT COUNT(*) AS cnt FROM booking_audit WHERE booking_id = ? AND action = "UPDATE"',
            [booking2Id]
        );

        if (audit2NoOpRows[0].cnt === 1) {
            console.log('>>> TEST 3 PASSED: No-Op status update produced NO extra audit row.');
        } else {
            throw new Error('TEST 3 FAILED: No-Op update incorrectly created an audit row');
        }

        // ---------------------------------------------------------------------
        // TEST 4: Stored Procedure Integration Trigger Test
        // ---------------------------------------------------------------------
        console.log('\n[TEST 4] CALL book_appointment stored procedure trigger test...');
        const [slot3Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-10", "11:00:00", 0)', [doctorId]);
        const slot3Id = slot3Res.insertId;

        await conn.query('CALL book_appointment(?, ?)', [patient1Id, slot3Id]);

        const [book3Row] = await conn.query('SELECT id FROM bookings WHERE slot_id = ?', [slot3Id]);
        const booking3Id = book3Row[0].id;

        const [audit3Rows] = await conn.query(
            'SELECT booking_id, old_status, new_status, action FROM booking_audit WHERE booking_id = ?',
            [booking3Id]
        );

        console.log('Audit record for Stored Procedure booking:', audit3Rows);

        if (audit3Rows.length === 1 && audit3Rows[0].action === 'INSERT' && audit3Rows[0].new_status === 'CONFIRMED') {
            console.log('>>> TEST 4 PASSED: Stored procedure execution automatically generated audit record.');
        } else {
            throw new Error('TEST 4 FAILED: Stored procedure failed to generate audit row');
        }

        // ---------------------------------------------------------------------
        // TEST 5: Expiry Flow Trigger Test
        // ---------------------------------------------------------------------
        console.log('\n[TEST 5] Expiry status change trigger test...');
        const [slot4Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-10", "12:00:00", 1)', [doctorId]);
        const slot4Id = slot4Res.insertId;

        const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const [book4Res] = await conn.query(
            'INSERT INTO bookings (slot_id, patient_id, status, created_at) VALUES (?, ?, "PENDING", ?)',
            [slot4Id, patient1Id, threeMinsAgo]
        );
        const booking4Id = book4Res.insertId;

        // Simulate expiry update
        await conn.query('UPDATE bookings SET status = "FAILED" WHERE id = ?', [booking4Id]);

        const [audit4Rows] = await conn.query(
            'SELECT booking_id, old_status, new_status, action FROM booking_audit WHERE booking_id = ? AND action = "UPDATE"',
            [booking4Id]
        );

        console.log('Audit record for Expiry update:', audit4Rows);

        if (audit4Rows.length === 1 && audit4Rows[0].old_status === 'PENDING' && audit4Rows[0].new_status === 'FAILED') {
            console.log('>>> TEST 5 PASSED: Expiry status update automatically generated UPDATE audit record.');
        } else {
            throw new Error('TEST 5 FAILED: Expiry status update failed to generate audit row');
        }

        // ---------------------------------------------------------------------
        // TEST 6: Transaction Rollback Behavior Test
        // ---------------------------------------------------------------------
        console.log('\n[TEST 6] Transaction Rollback behavior test...');
        const [slot5Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-10", "13:00:00", 0)', [doctorId]);
        const slot5Id = slot5Res.insertId;

        await conn.beginTransaction();
        const [book5Res] = await conn.query(
            'INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")',
            [slot5Id, patient1Id]
        );
        const booking5Id = book5Res.insertId;

        // Rollback transaction
        await conn.rollback();

        const [checkBook5] = await conn.query('SELECT COUNT(*) AS cnt FROM bookings WHERE id = ?', [booking5Id]);
        const [checkAudit5] = await conn.query('SELECT COUNT(*) AS cnt FROM booking_audit WHERE booking_id = ?', [booking5Id]);

        console.log(`Rollback check: booking count = ${checkBook5[0].cnt}, audit count = ${checkAudit5[0].cnt}`);

        if (checkBook5[0].cnt === 0 && checkAudit5[0].cnt === 0) {
            console.log('>>> TEST 6 PASSED: Rolled back transaction removed both booking and audit record completely.');
        } else {
            throw new Error('TEST 6 FAILED: Audit record remained after transaction rollback');
        }

        console.log('\n=== ALL TRIGGER TESTS PASSED SUCCESSFULLY! ===');

    } catch (err) {
        console.error('\n!!! TRIGGER TEST FAILED !!!', err);
        process.exit(1);
    } finally {
        conn.release();
        process.exit(0);
    }
}

runTriggerTests();
