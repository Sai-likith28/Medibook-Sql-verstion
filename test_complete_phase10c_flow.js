const pool = require('./src/config/mysql');
const authController = require('./src/controllers/authController');
const adminController = require('./src/controllers/adminController');
const patientController = require('./src/controllers/patientController');
const doctorController = require('./src/controllers/doctorController');
const { ensurePhase10bSchema } = require('./src/config/migratePhase10b');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

function mockRes() {
    const res = {};
    res.statusCode = 200;
    res.status = function (code) {
        this.statusCode = code;
        return this;
    };
    res.json = function (data) {
        this.body = data;
        return this;
    };
    return res;
}

async function runCompleteFlowTests() {
    console.log('=============================================================================');
    console.log('STARTING COMPLETE END-TO-END FLOW VERIFICATION (Phase 10C Persistence & Auth)');
    console.log('=============================================================================\n');

    try {
        // [Setup] Ensure DB Schema & Initial Generic Seed
        await ensurePhase10bSchema(pool);
        console.log('✅ DB Schema & Startup Migration verified.\n');

        // -----------------------------------------------------------------------------
        // SECTION 1: PATIENT REGISTRATION & AUTHENTICATED BOOKING FLOW
        // -----------------------------------------------------------------------------
        console.log('--- SECTION 1: PATIENT REGISTRATION & AUTHENTICATED BOOKING FLOW ---');

        // Test 1: Register new patient (Patient 3)
        const regReq = {
            body: {
                name: 'Patient 3',
                loginId: 'patient3',
                password: 'password123',
                email: 'patient3@example.test',
                phone: '555-0103'
            }
        };
        const regRes = mockRes();
        await authController.register(regReq, regRes);

        if (regRes.statusCode !== 201) {
            throw new Error(`Patient registration failed: ${JSON.stringify(regRes.body)}`);
        }
        console.log('✅ PASS: Patient 3 registered successfully (201 Created).');
        console.log(`   └─ Patient Code: ${regRes.body.user.patientCode}, User ID: ${regRes.body.user.id}`);

        // Verify password hash in MySQL
        const [userRows] = await pool.query('SELECT password_hash FROM users WHERE login_id = ?', ['patient3']);
        const storedHash = userRows[0].password_hash;
        const isBcrypt = storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$');
        if (!isBcrypt || storedHash.includes('password123')) {
            throw new Error('SECURITY VIOLATION: Password is not stored as bcrypt hash!');
        }
        console.log('✅ PASS: Password stored ONLY as secure bcrypt hash in MySQL.');

        // Test 2: Login as newly registered Patient 3
        const loginReq = { body: { loginId: 'patient3', password: 'password123' } };
        const loginRes = mockRes();
        await authController.login(loginReq, loginRes);
        if (loginRes.statusCode !== 200) {
            throw new Error(`Patient 3 login failed: ${JSON.stringify(loginRes.body)}`);
        }
        console.log('✅ PASS: Patient 3 logged in successfully with new credentials.');

        // -----------------------------------------------------------------------------
        // SECTION 2: ADMIN DOCTOR ONBOARDING & DOCTOR AUTHENTICATION FLOW
        // -----------------------------------------------------------------------------
        console.log('\n--- SECTION 2: ADMIN DOCTOR ONBOARDING & DOCTOR AUTHENTICATION FLOW ---');

        // Test 3: Admin 1 creates Doctor 3
        const createDocReq = {
            body: {
                name: 'Doctor 3',
                specialization: 'Pediatrics',
                email: 'doctor3@example.test'
            }
        };
        const createDocRes = mockRes();
        await adminController.createDoctor(createDocReq, createDocRes);

        if (createDocRes.statusCode !== 201) {
            throw new Error(`Admin doctor creation failed: ${JSON.stringify(createDocRes.body)}`);
        }

        const newDocCode = createDocRes.body.doctorCode;
        const tempPassword = createDocRes.body.tempPassword;
        console.log(`✅ PASS: Admin created Doctor 3 (Code: ${newDocCode}, Temp Password: ${tempPassword}).`);

        // Verify user & doctor records exist in MySQL
        const [docUserRows] = await pool.query('SELECT id, role, status FROM users WHERE login_id = ?', [newDocCode]);
        const [docRows] = await pool.query('SELECT id, name, specialization FROM doctors WHERE doctor_code = ?', [newDocCode]);

        if (docUserRows.length === 0 || docRows.length === 0) {
            throw new Error('Doctor accounts records missing from MySQL!');
        }
        console.log(`✅ PASS: Verified MySQL users and doctors linked records exist (User ID: ${docUserRows[0].id}, Doctor ID: ${docRows[0].id}).`);

        // Test 4: Doctor 3 logs in using generated Doctor Code and temporary password
        const docLoginReq = { body: { loginId: newDocCode, password: tempPassword } };
        const docLoginRes = mockRes();
        await authController.login(docLoginReq, docLoginRes);

        if (docLoginRes.statusCode !== 200 || docLoginRes.body.user.role !== 'DOCTOR') {
            throw new Error(`Doctor 3 login failed: ${JSON.stringify(docLoginRes.body)}`);
        }
        console.log(`✅ PASS: Doctor 3 logged in successfully and received DOCTOR role token (Doctor ID: ${docLoginRes.body.user.doctorId}).`);

        // -----------------------------------------------------------------------------
        // SECTION 3: DATABASE PERSISTENCE ACROSS SERVER RESTARTS
        // -----------------------------------------------------------------------------
        console.log('\n--- SECTION 3: DATABASE PERSISTENCE ACROSS SERVER RESTARTS ---');

        // Test 5: Admin creates a slot for Doctor 1
        const createSlotReq = {
            body: {
                doctorId: '1',
                date: '2026-12-25',
                time: '10:00'
            }
        };
        const createSlotRes = mockRes();
        await adminController.createSlot(createSlotReq, createSlotRes);

        if (createSlotRes.statusCode !== 201) {
            throw new Error(`Create slot failed: ${JSON.stringify(createSlotRes.body)}`);
        }
        const persistentSlotId = createSlotRes.body.id || createSlotRes.body._id;
        console.log(`✅ PASS: Admin created slot (ID: ${persistentSlotId}) for Doctor 1 on 2026-12-25 at 10:00.`);

        // Verify slot in MySQL
        const [slotRowsBefore] = await pool.query('SELECT id, doctor_id, is_booked FROM appointment_slots WHERE id = ?', [persistentSlotId]);
        if (slotRowsBefore.length === 0) {
            throw new Error('Slot not found in MySQL before restart!');
        }
        console.log('✅ PASS: Slot confirmed present in MySQL database.');

        // SIMULATE BACKEND SERVER RESTART
        console.log('\n[Simulating Backend Server Restart...]');
        // Run startup schema check (same function executed on app startup)
        await ensurePhase10bSchema(pool);
        console.log('[Backend Server Restart Completed]\n');

        // Query slots API after restart
        const getSlotsReq = { query: { doctorId: '1' } };
        const getSlotsRes = mockRes();
        await adminController.getSlots(getSlotsReq, getSlotsRes);

        const foundSlot = getSlotsRes.body.find((s) => String(s.id || s._id) === String(persistentSlotId));
        if (!foundSlot) {
            throw new Error('PERSISTENCE FAILURE: Slot disappeared after server restart!');
        }
        console.log('✅ PASS: Slot still exists in MySQL and API after backend server restart!');

        // Test 6: Patient 1 books the persistent slot
        const patient1TokenUser = {
            id: regRes.body.user.id,
            loginId: 'patient3',
            role: 'PATIENT',
            patientId: regRes.body.user.patientId
        };
        const bookReq = {
            user: patient1TokenUser,
            body: { slotId: String(persistentSlotId), patientName: 'Patient 3' }
        };
        const bookRes = mockRes();
        await patientController.bookSlot(bookReq, bookRes);

        if (bookRes.statusCode !== 201) {
            throw new Error(`Booking failed: ${JSON.stringify(bookRes.body)}`);
        }
        const createdBookingId = bookRes.body.id || bookRes.body._id;
        console.log(`✅ PASS: Patient 3 booked slot ${persistentSlotId} successfully (Booking ID: ${createdBookingId}).`);

        // SIMULATE SECOND BACKEND SERVER RESTART
        console.log('\n[Simulating Second Backend Server Restart...]');
        await ensurePhase10bSchema(pool);
        console.log('[Second Backend Server Restart Completed]\n');

        // Verify appointment & slot status after second restart
        const getApptReq = {
            user: patient1TokenUser,
            params: { id: String(createdBookingId) }
        };
        const getApptRes = mockRes();
        await patientController.getMyAppointmentById(getApptReq, getApptRes);

        if (getApptRes.statusCode !== 200 || getApptRes.body.status !== 'CONFIRMED') {
            throw new Error('PERSISTENCE FAILURE: Appointment lost or corrupted after server restart!');
        }
        console.log('✅ PASS: Appointment confirmed intact and status CONFIRMED after server restart!');

        const [slotRowsAfter] = await pool.query('SELECT is_booked FROM appointment_slots WHERE id = ?', [persistentSlotId]);
        if (slotRowsAfter[0].is_booked !== 1) {
            throw new Error('PERSISTENCE FAILURE: Slot is_booked state was reset after server restart!');
        }
        console.log('✅ PASS: Slot remains correctly marked as is_booked = 1 after server restart.');

        console.log('\n=============================================================================');
        console.log('ALL COMPLETE END-TO-END FLOW TESTS PASSED SUCCESSFULLY!');
        console.log('=============================================================================');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ TEST FAILURE:', err.message);
        console.error(err);
        process.exit(1);
    }
}

runCompleteFlowTests();
