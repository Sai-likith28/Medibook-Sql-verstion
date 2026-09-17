const pool = require('./src/config/mysql');
const adminController = require('./src/controllers/adminController');
const patientController = require('./src/controllers/patientController');
const bookingService = require('./src/services/bookingService');

// Helper mock response builder
function createMockRes() {
    return {
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
}

async function runErrorHandlingAndQualityTests() {
    console.log('=== STARTING STEP 8: TESTING & ERROR HANDLING QUALITY SUITE ===\n');

    const conn = await pool.getConnection();

    try {
        // Setup & Clean DB
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE booking_audit');
        await conn.query('TRUNCATE TABLE bookings');
        await conn.query('TRUNCATE TABLE appointment_slots');
        await conn.query('TRUNCATE TABLE patients');
        await conn.query('TRUNCATE TABLE doctors');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('[Setup] Database cleared for error handling test suite.\n');

        // ---------------------------------------------------------------------
        // SECTION 1: API Input Validation & Error Handling Tests
        // ---------------------------------------------------------------------
        console.log('--- SECTION 1: API Input Validation & Status Codes ---');

        // Test 1: createDoctor missing name/specialization
        const resDoc1 = createMockRes();
        await adminController.createDoctor({ body: { name: '', specialization: 'Cardiology' } }, resDoc1);
        console.log('Test 1 (Doctor missing name):', resDoc1.statusCode, resDoc1.data);
        if (resDoc1.statusCode !== 400 || resDoc1.data.error !== 'Name and specialization are required') {
            throw new Error('Test 1 Failed: Expected 400 Bad Request');
        }

        // Test 2: createDoctor whitespace name
        const resDoc2 = createMockRes();
        await adminController.createDoctor({ body: { name: '   ', specialization: 'Cardiology' } }, resDoc2);
        console.log('Test 2 (Doctor whitespace name):', resDoc2.statusCode, resDoc2.data);
        if (resDoc2.statusCode !== 400) {
            throw new Error('Test 2 Failed: Expected 400 Bad Request for whitespace name');
        }

        // Create valid Doctor for subsequent tests
        const resDocValid = createMockRes();
        await adminController.createDoctor({ body: { name: 'Doctor 1', specialization: 'General Medicine' } }, resDocValid);
        const validDoctorId = resDocValid.data._id;
        console.log('Valid Doctor Created ID:', validDoctorId);

        // Test 3: createSlot missing required fields
        const resSlot1 = createMockRes();
        await adminController.createSlot({ body: { doctorId: validDoctorId, date: '' } }, resSlot1);
        console.log('Test 3 (Slot missing time/date):', resSlot1.statusCode, resSlot1.data);
        if (resSlot1.statusCode !== 400 || resSlot1.data.error !== 'doctorId, date, and time are required') {
            throw new Error('Test 3 Failed: Expected 400 Bad Request');
        }

        // Test 4: createSlot non-existent doctorId
        const resSlot2 = createMockRes();
        await adminController.createSlot({ body: { doctorId: '999999', date: '2026-12-25', time: '09:00' } }, resSlot2);
        console.log('Test 4 (Slot non-existent doctor):', resSlot2.statusCode, resSlot2.data);
        if (resSlot2.statusCode !== 404 || resSlot2.data.error !== 'Doctor not found') {
            throw new Error('Test 4 Failed: Expected 404 Not Found');
        }

        // Create valid slot
        const resSlotValid = createMockRes();
        await adminController.createSlot({ body: { doctorId: validDoctorId, date: '2026-12-25', time: '09:00' } }, resSlotValid);
        const validSlotId = resSlotValid.data._id;
        console.log('Valid Slot Created ID:', validSlotId);

        // Test 5: createSlot duplicate slot
        const resSlotDup = createMockRes();
        await adminController.createSlot({ body: { doctorId: validDoctorId, date: '2026-12-25', time: '09:00' } }, resSlotDup);
        console.log('Test 5 (Duplicate slot creation):', resSlotDup.statusCode, resSlotDup.data);
        if (resSlotDup.statusCode !== 400 || !resSlotDup.data.error.includes('already exists')) {
            throw new Error('Test 5 Failed: Expected 400 Duplicate Slot error');
        }

        // Test 6: getBooking non-existent booking ID
        const resBookGet = createMockRes();
        await patientController.getBooking({ params: { id: '999999' } }, resBookGet);
        console.log('Test 6 (Get non-existent booking):', resBookGet.statusCode, resBookGet.data);
        if (resBookGet.statusCode !== 404 || resBookGet.data.error !== 'Booking not found') {
            throw new Error('Test 6 Failed: Expected 404 Booking Not Found');
        }

        // Test 7: bookSlot missing patientName or whitespace
        const resBookMissing = createMockRes();
        await patientController.bookSlot({ body: { slotId: validSlotId, patientName: '   ' } }, resBookMissing);
        console.log('Test 7 (Book slot whitespace name):', resBookMissing.statusCode, resBookMissing.data);
        if (resBookMissing.statusCode !== 400) {
            throw new Error('Test 7 Failed: Expected 400 Bad Request');
        }

        // Test 8: bookSlot non-existent slotId
        const resBookNoSlot = createMockRes();
        await patientController.bookSlot({ body: { slotId: '999999', patientName: 'Patient 1' } }, resBookNoSlot);
        console.log('Test 8 (Book non-existent slot):', resBookNoSlot.statusCode, resBookNoSlot.data);
        if (resBookNoSlot.statusCode !== 409 || resBookNoSlot.data.error !== 'Slot not available') {
            throw new Error('Test 8 Failed: Expected 409 Conflict for non-existent slot');
        }

        // Test 9: bookSlot successful booking
        const resBookSuccess = createMockRes();
        await patientController.bookSlot({ body: { slotId: validSlotId, patientName: 'Patient 1' } }, resBookSuccess);
        console.log('Test 9 (Successful booking):', resBookSuccess.statusCode, resBookSuccess.data);
        if (resBookSuccess.statusCode !== 201 || resBookSuccess.data.status !== 'CONFIRMED') {
            throw new Error('Test 9 Failed: Expected 201 Created');
        }


        // Test 10: bookSlot already-booked slot
        const resBookConflict = createMockRes();
        await patientController.bookSlot({ body: { slotId: validSlotId, patientName: 'Patient 2' } }, resBookConflict);
        console.log('Test 10 (Book already-booked slot):', resBookConflict.statusCode, resBookConflict.data);
        if (resBookConflict.statusCode !== 409 || resBookConflict.data.error !== 'Slot not available') {
            throw new Error('Test 10 Failed: Expected 409 Conflict for already-booked slot');
        }


        console.log('\n--- SECTION 2: Transaction & Rollback Integrity ---');

        // Test 11: Transaction rollback on booking failure
        console.log('Test 11: Verifying no orphan data left on failed transaction...');
        const [patientCountBefore] = await conn.query('SELECT COUNT(*) AS cnt FROM patients');
        const [bookingCountBefore] = await conn.query('SELECT COUNT(*) AS cnt FROM bookings');
        const [auditCountBefore] = await conn.query('SELECT COUNT(*) AS cnt FROM booking_audit');

        // Attempting to book invalid slot
        await bookingService.bookSlot('999999', 'Ghost Patient');

        const [patientCountAfter] = await conn.query('SELECT COUNT(*) AS cnt FROM patients');
        const [bookingCountAfter] = await conn.query('SELECT COUNT(*) AS cnt FROM bookings');
        const [auditCountAfter] = await conn.query('SELECT COUNT(*) AS cnt FROM booking_audit');

        if (patientCountBefore[0].cnt === patientCountAfter[0].cnt &&
            bookingCountBefore[0].cnt === bookingCountAfter[0].cnt &&
            auditCountBefore[0].cnt === auditCountAfter[0].cnt) {
            console.log('Test 11 Passed: Failed transaction left 0 orphan patient, booking, or audit records.');
        } else {
            throw new Error('Test 11 Failed: Orphan data created during failed transaction');
        }

        console.log('\n--- SECTION 3: Trigger & Audit Integrity Verification ---');

        // Test 12: Audit log row count matches bookings created
        const [auditRows] = await conn.query('SELECT * FROM booking_audit WHERE booking_id = ?', [resBookSuccess.data._id]);
        console.log('Test 12 Audit Rows:', auditRows);
        if (auditRows.length !== 1 || auditRows[0].action !== 'INSERT') {
            throw new Error('Test 12 Failed: Audit log row not correctly created');
        }

        console.log('\n=== ALL STEP 8 TESTING & ERROR HANDLING QUALITY TESTS PASSED! ===');

    } catch (err) {
        console.error('\n!!! STEP 8 TEST SUITE FAILED !!!', err);
        process.exit(1);
    } finally {
        conn.release();
        process.exit(0);
    }
}

runErrorHandlingAndQualityTests();
