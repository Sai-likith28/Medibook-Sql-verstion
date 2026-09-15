const pool = require('./src/config/mysql');

async function runStoredProcedureTests() {
    console.log('=== STARTING MYSQL STORED PROCEDURE TESTS (book_appointment) ===\n');

    const conn = await pool.getConnection();

    try {
        // 0. Cleanup Database for Procedure Test Run
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE bookings');
        await conn.query('TRUNCATE TABLE appointment_slots');
        await conn.query('TRUNCATE TABLE patients');
        await conn.query('TRUNCATE TABLE doctors');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('[Setup] Database tables cleared for stored procedure test run.');

        // Setup Base Test Data
        const [docRes] = await conn.query('INSERT INTO doctors (name, specialization) VALUES ("Dr. Stephen Strange", "Neurosurgery")');
        const doctorId = docRes.insertId;

        const [pat1Res] = await conn.query('INSERT INTO patients (name) VALUES ("Peter Parker")');
        const patient1Id = pat1Res.insertId;

        const [pat2Res] = await conn.query('INSERT INTO patients (name) VALUES ("Mary Jane")');
        const patient2Id = pat2Res.insertId;

        const [slot1Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-01", "10:00:00", 0)', [doctorId]);
        const slot1Id = slot1Res.insertId;

        console.log(`[Setup] Doctor ID: ${doctorId}, Patient 1 ID: ${patient1Id}, Patient 2 ID: ${patient2Id}, Slot 1 ID: ${slot1Id}`);

        // ---------------------------------------------------------------------
        // TEST A: Successful Booking via Stored Procedure
        // ---------------------------------------------------------------------
        console.log('\n[TEST A] Execute CALL book_appointment(patient1Id, slot1Id)...');
        await conn.query('CALL book_appointment(?, ?)', [patient1Id, slot1Id]);

        const [bookA] = await conn.query('SELECT id, slot_id, patient_id, status FROM bookings WHERE slot_id = ?', [slot1Id]);
        const [slotA] = await conn.query('SELECT is_booked FROM appointment_slots WHERE id = ?', [slot1Id]);

        console.log('Test A Booking Result:', bookA[0]);
        console.log('Test A Slot is_booked:', slotA[0].is_booked);

        if (bookA.length === 1 && bookA[0].status === 'CONFIRMED' && slotA[0].is_booked === 1) {
            console.log('>>> TEST A PASSED: Booking created with status CONFIRMED and slot marked as booked.');
        } else {
            throw new Error('TEST A FAILED: Incorrect booking or slot state');
        }

        // ---------------------------------------------------------------------
        // TEST B: Attempt Booking Already Booked Slot
        // ---------------------------------------------------------------------
        console.log('\n[TEST B] Attempt CALL book_appointment on already booked slot...');
        let testBPassed = false;
        try {
            await conn.query('CALL book_appointment(?, ?)', [patient2Id, slot1Id]);
        } catch (err) {
            console.log('Test B Caught Expected Error:', err.message);
            if (err.message.includes('Appointment slot is already booked')) {
                testBPassed = true;
            }
        }

        const [bookBCount] = await conn.query('SELECT COUNT(*) AS cnt FROM bookings WHERE slot_id = ?', [slot1Id]);
        console.log('Active bookings count for slot 1:', bookBCount[0].cnt);

        if (testBPassed && bookBCount[0].cnt === 1) {
            console.log('>>> TEST B PASSED: Rejected already booked slot cleanly with expected error.');
        } else {
            throw new Error('TEST B FAILED: Duplicate booking was not rejected properly');
        }

        // ---------------------------------------------------------------------
        // TEST C: Invalid Patient ID
        // ---------------------------------------------------------------------
        console.log('\n[TEST C] Attempt CALL book_appointment with invalid patient ID (99999)...');
        let testCPassed = false;
        const [slot2Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-01", "11:00:00", 0)', [doctorId]);
        const slot2Id = slot2Res.insertId;

        try {
            await conn.query('CALL book_appointment(99999, ?)', [slot2Id]);
        } catch (err) {
            console.log('Test C Caught Expected Error:', err.message);
            if (err.message.includes('Patient not found')) {
                testCPassed = true;
            }
        }

        const [slot2Check] = await conn.query('SELECT is_booked FROM appointment_slots WHERE id = ?', [slot2Id]);
        if (testCPassed && slot2Check[0].is_booked === 0) {
            console.log('>>> TEST C PASSED: Invalid patient rejected cleanly and slot remained unbooked.');
        } else {
            throw new Error('TEST C FAILED: Invalid patient was not handled correctly');
        }

        // ---------------------------------------------------------------------
        // TEST D: Invalid Slot ID
        // ---------------------------------------------------------------------
        console.log('\n[TEST D] Attempt CALL book_appointment with invalid slot ID (99999)...');
        let testDPassed = false;
        try {
            await conn.query('CALL book_appointment(?, 99999)', [patient1Id]);
        } catch (err) {
            console.log('Test D Caught Expected Error:', err.message);
            if (err.message.includes('Appointment slot not found')) {
                testDPassed = true;
            }
        }

        if (testDPassed) {
            console.log('>>> TEST D PASSED: Invalid slot rejected cleanly.');
        } else {
            throw new Error('TEST D FAILED: Invalid slot was not handled correctly');
        }

        // ---------------------------------------------------------------------
        // TEST E & F: Transaction Rollback & Database UNIQUE Constraint Integrity
        // ---------------------------------------------------------------------
        console.log('\n[TEST E & F] Verify Database Constraint & Rollback Integrity...');
        const [slot3Res] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-12-01", "12:00:00", 0)', [doctorId]);
        const slot3Id = slot3Res.insertId;

        // Create booking directly
        await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")', [slot3Id, patient1Id]);

        // Attempting another direct INSERT into bookings for slot3Id to trigger uk_active_slot_booking
        let testFPassed = false;
        try {
            await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "PENDING")', [slot3Id, patient2Id]);
        } catch (err) {
            console.log('Test F Caught Expected Unique Constraint Error:', err.message);
            if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
                testFPassed = true;
            }
        }

        if (testFPassed) {
            console.log('>>> TEST E & F PASSED: Database uk_active_slot_booking constraint remains active and enforced.');
        } else {
            throw new Error('TEST E & F FAILED: Unique constraint failed to trigger');
        }

        // ---------------------------------------------------------------------
        // STORED PROCEDURE CONCURRENCY TEST (Section 14)
        // ---------------------------------------------------------------------
        console.log('\n[STORED PROCEDURE CONCURRENCY TEST] Simulating 2 concurrent CALL book_appointment on slot 2...');

        const conn1 = await pool.getConnection();
        const conn2 = await pool.getConnection();

        const p1 = conn1.query('CALL book_appointment(?, ?)', [patient1Id, slot2Id]);
        const p2 = conn2.query('CALL book_appointment(?, ?)', [patient2Id, slot2Id]);

        const results = await Promise.allSettled([p1, p2]);
        conn1.release();
        conn2.release();

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        console.log(`Concurrent Calls Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`);
        if (rejected.length > 0) {
            console.log('Rejected Error Message:', rejected[0].reason.message);
        }

        const [concBookings] = await conn.query('SELECT COUNT(*) AS cnt FROM bookings WHERE slot_id = ? AND status IN ("PENDING", "CONFIRMED")', [slot2Id]);
        const [concSlot] = await conn.query('SELECT is_booked FROM appointment_slots WHERE id = ?', [slot2Id]);

        console.log(`Concurrency DB State: is_booked = ${concSlot[0].is_booked}, Active Bookings Count = ${concBookings[0].cnt}`);

        if (fulfilled.length === 1 && rejected.length === 1 && concSlot[0].is_booked === 1 && concBookings[0].cnt === 1) {
            console.log('>>> STORED PROCEDURE CONCURRENCY TEST PASSED: Exactly 1 call succeeded, 1 failed, DB state is perfectly consistent.');
        } else {
            throw new Error('STORED PROCEDURE CONCURRENCY TEST FAILED');
        }

        console.log('\n=== ALL STORED PROCEDURE TESTS PASSED SUCCESSFULLY! ===');

    } catch (err) {
        console.error('\n!!! STORED PROCEDURE TEST FAILED !!!', err);
        process.exit(1);
    } finally {
        conn.release();
        process.exit(0);
    }
}

runStoredProcedureTests();
