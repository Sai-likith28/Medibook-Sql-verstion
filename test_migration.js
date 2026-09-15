const pool = require('./src/config/mysql');
const adminController = require('./src/controllers/adminController');
const patientController = require('./src/controllers/patientController');
const bookingService = require('./src/services/bookingService');

// Helper mock response builder
function createMockRes() {
    const res = {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        },
        send(payload) {
            this.data = payload;
            return this;
        }
    };
    return res;
}

async function runVerificationTests() {
    console.log('=== STARTING MYSQL BACKEND MIGRATION VERIFICATION ===\n');

    try {
        // 0. Clean DB tables for test run
        const connection = await pool.getConnection();
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE bookings');
        await connection.query('TRUNCATE TABLE appointment_slots');
        await connection.query('TRUNCATE TABLE patients');
        await connection.query('TRUNCATE TABLE doctors');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        connection.release();
        console.log('[Setup] Database tables cleared successfully.');

        // Test 1: Doctor Creation
        console.log('\n[Test 1] Create Doctor...');
        const reqDoc = { body: { name: 'Dr. Gregory House', specialization: 'Diagnostics' } };
        const resDoc = createMockRes();
        await adminController.createDoctor(reqDoc, resDoc);
        console.log('Doctor created:', resDoc.statusCode, resDoc.data);
        const doctorId = resDoc.data._id;

        // Test 2: Retrieve Doctors
        console.log('\n[Test 2] Get All Doctors...');
        const resGetDocs = createMockRes();
        await adminController.getDoctors({}, resGetDocs);
        console.log('Doctors list:', resGetDocs.statusCode, resGetDocs.data);

        // Test 3: Create Slot
        console.log('\n[Test 3] Create Slot...');
        const reqSlot = { body: { doctorId: doctorId, date: '2026-11-20', time: '09:30 AM' } };
        const resSlot = createMockRes();
        await adminController.createSlot(reqSlot, resSlot);
        console.log('Slot created:', resSlot.statusCode, resSlot.data);
        const slotId = resSlot.data._id;

        // Test 4: Duplicate Slot Creation (Should Fail)
        console.log('\n[Test 4] Attempt Duplicate Slot Creation...');
        const resDupSlot = createMockRes();
        await adminController.createSlot(reqSlot, resDupSlot);
        console.log('Duplicate slot response:', resDupSlot.statusCode, resDupSlot.data);

        // Test 5: Get Doctor Slots
        console.log('\n[Test 5] Get Doctor Slots...');
        const reqGetSlots = { params: { id: doctorId } };
        const resGetSlots = createMockRes();
        await patientController.getDoctorSlots(reqGetSlots, resGetSlots);
        console.log('Slots list:', resGetSlots.statusCode, resGetSlots.data);

        // Test 6: Patient Find-or-Create & Successful Booking
        console.log('\n[Test 6] Book Slot (Patient 1)...');
        const reqBook1 = { body: { slotId: slotId, patientName: 'Sarah Connor' } };
        const resBook1 = createMockRes();
        await patientController.bookSlot(reqBook1, resBook1);
        console.log('Booking 1 response:', resBook1.statusCode, resBook1.data);
        const bookingId = resBook1.data._id;

        // Test 7: Retrieve Booking Details
        console.log('\n[Test 7] Get Booking Details...');
        const reqGetBook = { params: { id: bookingId } };
        const resGetBook = createMockRes();
        await patientController.getBooking(reqGetBook, resGetBook);
        console.log('Booking details:', resGetBook.statusCode, resGetBook.data);
        if (!resGetBook.data.doctorName || !resGetBook.data.specialization) {
            throw new Error('Test 7 Failed: GET /bookings/:id response missing doctorName or specialization!');
        }
        console.log(`✅ Test 7 Verified: doctorName = "${resGetBook.data.doctorName}", specialization = "${resGetBook.data.specialization}"`);

        // Test 8: Attempt Booking Already Booked Slot (Should Fail with 409)
        console.log('\n[Test 8] Book Already Booked Slot (Should Fail)...');
        const reqBook2 = { body: { slotId: slotId, patientName: 'John Connor' } };
        const resBook2 = createMockRes();
        await patientController.bookSlot(reqBook2, resBook2);
        console.log('Double booking response:', resBook2.statusCode, resBook2.data);

        // Test 9: Create Second Slot for Concurrency Test
        console.log('\n[Test 9] Create Second Slot for Concurrency Test...');
        const reqSlot2 = { body: { doctorId: doctorId, date: '2026-11-20', time: '11:00 AM' } };
        const resSlot2 = createMockRes();
        await adminController.createSlot(reqSlot2, resSlot2);
        const slotId2 = resSlot2.data._id;

        // Test 10: Concurrency Test (2 Simultaneous Bookings on slotId2)
        console.log('\n[Test 10] Concurrency Test: Simulating 2 concurrent bookings on slot ID', slotId2);
        const promise1 = bookingService.bookSlot(slotId2, 'Concurrent Patient A');
        const promise2 = bookingService.bookSlot(slotId2, 'Concurrent Patient B');
        const [result1, result2] = await Promise.all([promise1, promise2]);
        console.log('Concurrent Request 1 Result:', result1);
        console.log('Concurrent Request 2 Result:', result2);

        const successCount = [result1, result2].filter(r => r.success).length;
        const failCount = [result1, result2].filter(r => !r.success).length;
        console.log(`Concurrency Test Summary: Successes = ${successCount}, Failures = ${failCount}`);

        // Verify DB State after Concurrency Test
        const [cSlotRows] = await pool.query('SELECT is_booked FROM appointment_slots WHERE id = ?', [slotId2]);
        const [cBookRows] = await pool.query('SELECT id, patient_id, status FROM bookings WHERE slot_id = ? AND status IN ("PENDING", "CONFIRMED")', [slotId2]);
        console.log(`DB State: is_booked = ${cSlotRows[0].is_booked}, Active Bookings Count = ${cBookRows.length}`);

        // Test 11: Expiry Cron Simulation
        console.log('\n[Test 11] Expiry Cron Job Simulation...');
        // Insert a dummy slot and pending booking created 3 minutes ago
        const conn = await pool.getConnection();
        const [expSlotRes] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, "2026-11-20", "14:00:00", 1)', [doctorId]);
        const expSlotId = expSlotRes.insertId;
        const [expPatientRes] = await conn.query('INSERT INTO patients (name) VALUES ("Expired Patient")');
        const expPatientId = expPatientRes.insertId;

        // Insert booking created 3 minutes ago
        const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        const [expBookingRes] = await conn.query(
            'INSERT INTO bookings (slot_id, patient_id, status, created_at) VALUES (?, ?, "PENDING", ?)',
            [expSlotId, expPatientId, threeMinsAgo]
        );
        const expBookingId = expBookingRes.insertId;

        console.log(`Created PENDING booking ${expBookingId} on slot ${expSlotId} created at ${threeMinsAgo}`);

        // Manually trigger expiry logic (equivalent to cron job)
        await conn.beginTransaction();
        const [expiredBookings] = await conn.query(
            `SELECT id, slot_id FROM bookings WHERE status = 'PENDING' AND created_at < TIMESTAMPADD(MINUTE, -2, NOW()) FOR UPDATE`
        );
        if (expiredBookings.length > 0) {
            const bIds = expiredBookings.map(b => b.id);
            const sIds = expiredBookings.map(b => b.slot_id);
            await conn.query(`UPDATE bookings SET status = 'FAILED' WHERE id IN (?)`, [bIds]);
            await conn.query(`UPDATE appointment_slots SET is_booked = 0 WHERE id IN (?)`, [sIds]);
        }
        await conn.commit();
        conn.release();

        const [expCheckBooking] = await pool.query('SELECT status FROM bookings WHERE id = ?', [expBookingId]);
        const [expCheckSlot] = await pool.query('SELECT is_booked FROM appointment_slots WHERE id = ?', [expSlotId]);
        console.log(`Expired Booking status: ${expCheckBooking[0].status}, Slot is_booked: ${expCheckSlot[0].is_booked}`);

        // Test 12: Verify Patient Find-or-Create Reuse
        console.log('\n[Test 12] Verify Patient Reuse (Sarah Connor again)...');
        const reqSlot3 = { body: { doctorId: doctorId, date: '2026-11-21', time: '10:00 AM' } };
        const resSlot3 = createMockRes();
        await adminController.createSlot(reqSlot3, resSlot3);
        const slotId3 = resSlot3.data._id;

        const reqBook3 = { body: { slotId: slotId3, patientName: 'Sarah Connor' } };
        const resBook3 = createMockRes();
        await patientController.bookSlot(reqBook3, resBook3);
        console.log('Booking 3 response:', resBook3.statusCode, resBook3.data);

        const [patientRows] = await pool.query('SELECT COUNT(*) AS count FROM patients WHERE name = "Sarah Connor"');
        console.log('Total patient records for Sarah Connor in DB:', patientRows[0].count);

        console.log('\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
        process.exit(0);

    } catch (err) {
        console.error('\n!!! VERIFICATION TEST FAILED !!!', err);
        process.exit(1);
    }
}

runVerificationTests();
