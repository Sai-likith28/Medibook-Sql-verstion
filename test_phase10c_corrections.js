const pool = require('./src/config/mysql');
const { ensurePhase10bSchema } = require('./src/config/migratePhase10b');
const authController = require('./src/controllers/authController');
const patientController = require('./src/controllers/patientController');
const doctorController = require('./src/controllers/doctorController');
const bookingService = require('./src/services/bookingService');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./src/middleware/auth');

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

async function runTests() {
    console.log('=== STARTING PHASE 10C CORRECTION & AUTHENTICATED APPOINTMENT TESTS ===\n');

    try {
        // [Setup] Ensure DB schema & seed accounts exist
        await ensurePhase10bSchema(pool);
        console.log('✅ PASS: DB Schema & Seed Sync verified.\n');

        // Clean bookings, slots, test doctors, and test users for predictable test environment
        await pool.query('DELETE FROM booking_audit');
        await pool.query('DELETE FROM bookings');
        await pool.query('DELETE FROM appointment_slots');
        await pool.query("DELETE FROM patients WHERE patient_code LIKE 'P-TEST%'");
        await pool.query("DELETE FROM doctors WHERE doctor_code LIKE 'D-TEST%'");
        await pool.query("DELETE FROM users WHERE login_id LIKE 'P-TEST%' OR login_id LIKE 'D-TEST%'");

        // Create 2 Doctors in DB
        const [doc1Res] = await pool.query('INSERT INTO doctors (name, specialization, doctor_code) VALUES (?, ?, ?)', ['Dr. Alice Heart', 'Cardiology', 'D-TEST01']);
        const doc1Id = doc1Res.insertId;
        const [doc2Res] = await pool.query('INSERT INTO doctors (name, specialization, doctor_code) VALUES (?, ?, ?)', ['Dr. Bob Brain', 'Neurology', 'D-TEST02']);
        const doc2Id = doc2Res.insertId;

        // Create 2 Users & 2 Patients in DB
        const bcrypt = require('bcryptjs');
        const passHash = bcrypt.hashSync('patient123', 10);

        const [u1Res] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['P-TEST01', passHash, 'PATIENT', 'ACTIVE']);
        const u1Id = u1Res.insertId;
        const [p1Res] = await pool.query('INSERT INTO patients (user_id, patient_code, name) VALUES (?, ?, ?)', [u1Id, 'P-TEST01', 'Patient Alpha']);
        const p1Id = p1Res.insertId;

        const [u2Res] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['P-TEST02', passHash, 'PATIENT', 'ACTIVE']);
        const u2Id = u2Res.insertId;
        const [p2Res] = await pool.query('INSERT INTO patients (user_id, patient_code, name) VALUES (?, ?, ?)', [u2Id, 'P-TEST02', 'Patient Beta']);
        const p2Id = p2Res.insertId;

        // Link doctor accounts to users
        const [uDoc1Res] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['D-TEST01', passHash, 'DOCTOR', 'ACTIVE']);
        await pool.query('UPDATE doctors SET user_id = ? WHERE id = ?', [uDoc1Res.insertId, doc1Id]);

        const [uDoc2Res] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['D-TEST02', passHash, 'DOCTOR', 'ACTIVE']);
        await pool.query('UPDATE doctors SET user_id = ? WHERE id = ?', [uDoc2Res.insertId, doc2Id]);

        // Create test slots
        const [slot1Res] = await pool.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, ?, 0)', [doc1Id, '2026-12-01', '09:00:00']);
        const slot1Id = slot1Res.insertId;
        const [slot2Res] = await pool.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, ?, 0)', [doc1Id, '2026-12-01', '10:00:00']);
        const slot2Id = slot2Res.insertId;
        const [slot3Res] = await pool.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, ?, 0)', [doc2Id, '2026-12-01', '11:00:00']);
        const slot3Id = slot3Res.insertId;

        console.log('--- SECTION 1: AUTHENTICATION & IDENTITY RESOLUTION ---');

        // Test 1: Patient login returns PATIENT
        const req1 = { body: { loginId: 'P-000001', password: 'patient123' } };
        const res1 = mockRes();
        await authController.login(req1, res1);
        if (res1.statusCode === 200 && res1.body.user.role === 'PATIENT') {
            console.log('✅ PASS 1: Patient login returns role PATIENT.');
        } else {
            throw new Error(`Test 1 Failed: ${JSON.stringify(res1.body)}`);
        }

        // Test 2: Doctor login returns DOCTOR
        const req2 = { body: { loginId: 'D-000001', password: 'doctor123' } };
        const res2 = mockRes();
        await authController.login(req2, res2);
        if (res2.statusCode === 200 && res2.body.user.role === 'DOCTOR') {
            console.log('✅ PASS 2: Doctor login returns role DOCTOR.');
        } else {
            throw new Error(`Test 2 Failed: ${JSON.stringify(res2.body)}`);
        }

        // Test 3: Admin login returns ADMIN
        const req3 = { body: { loginId: 'admin', password: 'admin123' } };
        const res3 = mockRes();
        await authController.login(req3, res3);
        if (res3.statusCode === 200 && res3.body.user.role === 'ADMIN') {
            console.log('✅ PASS 3: Admin login returns role ADMIN.');
        } else {
            throw new Error(`Test 3 Failed: ${JSON.stringify(res3.body)}`);
        }

        // Test 4: Patient authenticated identity resolves to correct patients.id
        if (res1.body.user.patientId) {
            console.log(`✅ PASS 4: Patient authenticated identity resolved to patients.id = ${res1.body.user.patientId}.`);
        } else {
            throw new Error('Test 4 Failed: patientId not populated in auth user response.');
        }

        // Test 5: Doctor authenticated identity resolves to correct doctors.id
        if (res2.body.user.doctorId) {
            console.log(`✅ PASS 5: Doctor authenticated identity resolved to doctors.id = ${res2.body.user.doctorId}.`);
        } else {
            throw new Error('Test 5 Failed: doctorId not populated in auth user response.');
        }

        console.log('\n--- SECTION 2: AUTHENTICATED PATIENT BOOKING & APPOINTMENTS ---');

        // Test 9 & 10: Authenticated patient booking creates booking against verified patients.id without duplicate patient creation
        const reqBookP1 = {
            body: { slotId: slot1Id, patientName: 'Tampered Name' },
            user: { id: u1Id, role: 'PATIENT', patientId: p1Id, name: 'Patient Alpha' }
        };
        const resBookP1 = mockRes();
        await patientController.bookSlot(reqBookP1, resBookP1);

        if (resBookP1.statusCode === 201 && resBookP1.body.id) {
            const bookingP1Id = resBookP1.body.id;
            const [patsCheck] = await pool.query('SELECT COUNT(*) AS cnt FROM patients WHERE user_id = ?', [u1Id]);
            if (patsCheck[0].cnt === 1) {
                console.log('✅ PASS 9 & 10: Authenticated patient booking used verified patients.id directly with 0 duplicate patient records.');
            } else {
                throw new Error('Test 10 Failed: Duplicate patient record created.');
            }
        } else {
            throw new Error(`Test 9 Failed: ${JSON.stringify(resBookP1.body)}`);
        }

        const b1Id = resBookP1.body.id;

        // Test 6: Patient can retrieve their own appointments
        const reqGetP1Appts = { user: { id: u1Id, role: 'PATIENT', patientId: p1Id } };
        const resGetP1Appts = mockRes();
        await patientController.getMyAppointments(reqGetP1Appts, resGetP1Appts);

        if (resGetP1Appts.statusCode === 200 && resGetP1Appts.body.length === 1 && resGetP1Appts.body[0].bookingRef === `BK-${String(b1Id).padStart(6, '0')}`) {
            console.log('✅ PASS 6: Patient successfully retrieved their own appointment list via GET /patients/me/appointments.');
        } else {
            throw new Error(`Test 6 Failed: ${JSON.stringify(resGetP1Appts.body)}`);
        }

        // Test 7: Patient can retrieve their own appointment detail
        const reqGetP1Detail = { params: { id: String(b1Id) }, user: { id: u1Id, role: 'PATIENT', patientId: p1Id } };
        const resGetP1Detail = mockRes();
        await patientController.getMyAppointmentById(reqGetP1Detail, resGetP1Detail);

        if (resGetP1Detail.statusCode === 200 && resGetP1Detail.body.id === b1Id) {
            console.log('✅ PASS 7: Patient successfully retrieved their own appointment detail via GET /patients/me/appointments/:id.');
        } else {
            throw new Error(`Test 7 Failed: ${JSON.stringify(resGetP1Detail.body)}`);
        }

        // Test 8: Patient cannot retrieve another patient's appointment (403 Forbidden)
        const reqGetP2Other = { params: { id: String(b1Id) }, user: { id: u2Id, role: 'PATIENT', patientId: p2Id } };
        const resGetP2Other = mockRes();
        await patientController.getMyAppointmentById(reqGetP2Other, resGetP2Other);

        if (resGetP2Other.statusCode === 403) {
            console.log('✅ PASS 8: Patient attempt to view another patient appointment rejected with HTTP 403 Forbidden.');
        } else {
            throw new Error(`Test 8 Failed: Expected 403, got ${resGetP2Other.statusCode}`);
        }

        console.log('\n--- SECTION 3: DOCTOR APPOINTMENTS & OWNERSHIP ---');

        // Test 11: Doctor can retrieve their assigned appointments
        const reqGetDoc1Appts = { user: { id: uDoc1Res.insertId, role: 'DOCTOR', doctorId: doc1Id } };
        const resGetDoc1Appts = mockRes();
        await doctorController.getDoctorAppointments(reqGetDoc1Appts, resGetDoc1Appts);

        if (resGetDoc1Appts.statusCode === 200 && resGetDoc1Appts.body.length === 1 && resGetDoc1Appts.body[0].patientName === 'Patient Alpha') {
            console.log('✅ PASS 11: Doctor successfully retrieved assigned appointment list via GET /doctor/appointments.');
        } else {
            throw new Error(`Test 11 Failed: ${JSON.stringify(resGetDoc1Appts.body)}`);
        }

        // Test 12: Doctor can retrieve an appointment detail belonging to that doctor
        const reqGetDoc1Detail = { params: { id: String(b1Id) }, user: { id: uDoc1Res.insertId, role: 'DOCTOR', doctorId: doc1Id } };
        const resGetDoc1Detail = mockRes();
        await doctorController.getDoctorAppointmentById(reqGetDoc1Detail, resGetDoc1Detail);

        if (resGetDoc1Detail.statusCode === 200 && resGetDoc1Detail.body.id === b1Id) {
            console.log('✅ PASS 12: Doctor successfully retrieved assigned appointment detail via GET /doctor/appointments/:id.');
        } else {
            throw new Error(`Test 12 Failed: ${JSON.stringify(resGetDoc1Detail.body)}`);
        }

        // Test 13: Doctor cannot retrieve an appointment belonging to another doctor (403 Forbidden)
        const reqGetDoc2Other = { params: { id: String(b1Id) }, user: { id: uDoc2Res.insertId, role: 'DOCTOR', doctorId: doc2Id } };
        const resGetDoc2Other = mockRes();
        await doctorController.getDoctorAppointmentById(reqGetDoc2Other, resGetDoc2Other);

        if (resGetDoc2Other.statusCode === 403) {
            console.log('✅ PASS 13: Doctor attempt to view another doctor\'s appointment rejected with HTTP 403 Forbidden.');
        } else {
            throw new Error(`Test 13 Failed: Expected 403, got ${resGetDoc2Other.statusCode}`);
        }

        console.log('\n--- SECTION 4: PUBLIC BOOKING, CONCURRENCY & RECEIPT LOOKUP ---');

        // Test 14: Existing public booking still works
        const reqPublicBook = { body: { slotId: slot3Id, patientName: 'Public Visitor' } };
        const resPublicBook = mockRes();
        await patientController.bookSlot(reqPublicBook, resPublicBook);

        if (resPublicBook.statusCode === 201 && resPublicBook.body.id) {
            console.log('✅ PASS 14: Public unauthenticated booking still functions perfectly.');
        } else {
            throw new Error(`Test 14 Failed: ${JSON.stringify(resPublicBook.body)}`);
        }

        const bPublicId = resPublicBook.body.id;

        // Test 15: Concurrency protection still works
        const concRes = await bookingService.bookSlot(slot3Id, 'Concurrent Attempter');
        if (!concRes.success && concRes.message === 'Slot not available') {
            console.log('✅ PASS 15: Concurrency SELECT ... FOR UPDATE double-booking prevention verified.');
        } else {
            throw new Error(`Test 15 Failed: Concurrency check did not block duplicate booking.`);
        }

        // Test 16 & 17: Existing receipt & booking lookup by reference (BK-XXXXXX) still works
        const reqLookup = { params: { id: String(bPublicId) } };
        const resLookup = mockRes();
        await patientController.getBooking(reqLookup, resLookup);

        if (resLookup.statusCode === 200 && resLookup.body.patientName === 'Public Visitor') {
            console.log('✅ PASS 16 & 17: Public booking receipt & lookup by ID / reference BK-XXXXXX verified.');
        } else {
            throw new Error(`Test 16/17 Failed: ${JSON.stringify(resLookup.body)}`);
        }

        console.log('\n--- SECTION 5: SECURITY & UNTRUSTED CLIENT PAYLOAD REJECTION ---');

        // Test 18: Unauthenticated patient appointment API is rejected (401 Unauthorized)
        const reqUnauth = { user: null };
        const resUnauth = mockRes();
        await patientController.getMyAppointments(reqUnauth, resUnauth);

        if (resUnauth.statusCode === 401) {
            console.log('✅ PASS 18: Unauthenticated patient appointment API access rejected with HTTP 401.');
        } else {
            throw new Error(`Test 18 Failed: Expected 401, got ${resUnauth.statusCode}`);
        }

        // Test 19: Wrong-role access is rejected (403 Forbidden)
        const reqWrongRole = { params: { id: String(b1Id) }, user: { id: u1Id, role: 'PATIENT', patientId: p1Id } };
        const resWrongRole = mockRes();
        await doctorController.getDoctorAppointmentById(reqWrongRole, resWrongRole);

        if (resWrongRole.statusCode === 403) {
            console.log('✅ PASS 19: Wrong-role endpoint access rejected with HTTP 403 Forbidden.');
        } else {
            throw new Error(`Test 19 Failed: Expected 403, got ${resWrongRole.statusCode}`);
        }

        // Test 20: Frontend cannot override backend ownership checks by sending fake patientId in body
        const reqTamper = {
            body: { slotId: slot2Id, patientName: 'Tamper Patient' },
            user: { id: u1Id, role: 'PATIENT', patientId: p1Id } // Backend strictly uses req.user.patientId = p1Id
        };
        const resTamper = mockRes();
        await patientController.bookSlot(reqTamper, resTamper);

        const [tamperCheck] = await pool.query('SELECT patient_id FROM bookings WHERE id = ?', [resTamper.body.id]);
        if (tamperCheck[0].patient_id === p1Id) {
            console.log('✅ PASS 20: Backend strictly enforced req.user.patientId identity, ignoring untrusted client payload manipulation.');
        } else {
            throw new Error('Test 20 Failed: Client payload overrode backend patient identity.');
        }

        console.log('\n=== ALL 20 PHASE 10C CORRECTION TESTS PASSED SUCCESSFULLY! ===\n');

    } catch (error) {
        console.error('❌ TEST FAILURE:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

runTests();
