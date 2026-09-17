const pool = require('./src/config/mysql');
const { ensurePhase10bSchema } = require('./src/config/migratePhase10b');
const doctorController = require('./src/controllers/doctorController');
const patientController = require('./src/controllers/patientController');
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

async function runTests() {
    console.log('=== STARTING PHASE 10C.2 CLINICAL TEST WORKFLOW TESTS ===\n');
    let passCount = 0;
    let failCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passCount++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failCount++;
        }
    }

    try {
        await ensurePhase10bSchema(pool);
        console.log('✅ PASS: DB Schema & Seed Sync verified.\n');

        // Clean test data
        await pool.query('DELETE FROM test_results');
        await pool.query('DELETE FROM appointment_tests');
        await pool.query('DELETE FROM booking_audit');
        await pool.query('DELETE FROM bookings');
        await pool.query('DELETE FROM appointment_slots');
        await pool.query("DELETE FROM patients WHERE patient_code LIKE 'P-TEST%'");
        await pool.query("DELETE FROM doctors WHERE doctor_code LIKE 'D-TEST%'");
        await pool.query("DELETE FROM users WHERE login_id LIKE 'P-TEST%' OR login_id LIKE 'D-TEST%'");

        // Seed 2 Doctors
        const [d1] = await pool.query('INSERT INTO doctors (name, specialization, doctor_code) VALUES (?, ?, ?)', ['Dr. Test One', 'Cardiology', 'D-TEST01']);
        const doc1Id = d1.insertId;
        const [d2] = await pool.query('INSERT INTO doctors (name, specialization, doctor_code) VALUES (?, ?, ?)', ['Dr. Test Two', 'Pediatrics', 'D-TEST02']);
        const doc2Id = d2.insertId;

        const passHash = bcrypt.hashSync('doctor123', 10);
        const [uDoc1] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['D-TEST01', passHash, 'DOCTOR', 'ACTIVE']);
        await pool.query('UPDATE doctors SET user_id = ? WHERE id = ?', [uDoc1.insertId, doc1Id]);

        const [uDoc2] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['D-TEST02', passHash, 'DOCTOR', 'ACTIVE']);
        await pool.query('UPDATE doctors SET user_id = ? WHERE id = ?', [uDoc2.insertId, doc2Id]);

        // Seed 2 Patients
        const [uPat1] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['P-TEST01', passHash, 'PATIENT', 'ACTIVE']);
        const [p1] = await pool.query('INSERT INTO patients (user_id, patient_code, name) VALUES (?, ?, ?)', [uPat1.insertId, 'P-TEST01', 'Patient One']);
        const pat1Id = p1.insertId;

        const [uPat2] = await pool.query('INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, ?, ?)', ['P-TEST02', passHash, 'PATIENT', 'ACTIVE']);
        const [p2] = await pool.query('INSERT INTO patients (user_id, patient_code, name) VALUES (?, ?, ?)', [uPat2.insertId, 'P-TEST02', 'Patient Two']);
        const pat2Id = p2.insertId;

        // Seed slots & bookings
        const [s1] = await pool.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, ?, 1)', [doc1Id, '2026-12-10', '09:00:00']);
        const slot1Id = s1.insertId;
        const [b1] = await pool.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, ?)', [slot1Id, pat1Id, 'CONFIRMED']);
        const booking1Id = b1.insertId;

        const [s2] = await pool.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, ?, 1)', [doc2Id, '2026-12-10', '10:00:00']);
        const slot2Id = s2.insertId;
        const [b2] = await pool.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, ?)', [slot2Id, pat2Id, 'CONFIRMED']);
        const booking2Id = b2.insertId;

        console.log('--- SECTION 1: TEST CATALOG & AUTHORIZATION ---');

        // Test 1: Doctor catalog access
        let req = { user: { role: 'DOCTOR', doctorId: doc1Id } };
        let res = mockRes();
        await doctorController.getTestCatalog(req, res);
        assert(res.statusCode === 200 && Array.isArray(res.body) && res.body.length >= 4, '1. GET /doctor/tests with Doctor JWT succeeds and returns catalog array');

        // Test 2: Non-doctor catalog access rejection
        req = { user: { role: 'PATIENT', patientId: pat1Id } };
        res = mockRes();
        await doctorController.getTestCatalog(req, res);
        assert(res.statusCode === 403, '2. GET /doctor/tests with Patient JWT returns 403 Forbidden');

        console.log('\n--- SECTION 2: TEST SUGGESTION & CONSTRAINTS ---');

        // Test 3: Doctor suggests test for assigned appointment
        req = {
            user: { role: 'DOCTOR', doctorId: doc1Id },
            params: { id: booking1Id },
            body: { testId: 1, instructions: 'Fasting 8 hours' }
        };
        res = mockRes();
        await doctorController.suggestTest(req, res);
        assert(res.statusCode === 201 && res.body.testId === 1 && res.body.instructions === 'Fasting 8 hours', '3. POST /doctor/appointments/:id/tests suggests test successfully (201 Created)');

        // Test 4: Duplicate test suggestion rejection (UK uk_booking_test)
        req = {
            user: { role: 'DOCTOR', doctorId: doc1Id },
            params: { id: booking1Id },
            body: { testId: 1 }
        };
        res = mockRes();
        await doctorController.suggestTest(req, res);
        assert(res.statusCode === 409, '4. POST /doctor/appointments/:id/tests with duplicate testId returns 409 Conflict');

        // Test 5: Cross-doctor test suggestion rejection
        req = {
            user: { role: 'DOCTOR', doctorId: doc2Id },
            params: { id: booking1Id },
            body: { testId: 2 }
        };
        res = mockRes();
        await doctorController.suggestTest(req, res);
        assert(res.statusCode === 403, '5. POST /doctor/appointments/:id/tests by unassigned doctor returns 403 Forbidden');

        // Test 6: Non-existent testId suggestion
        req = {
            user: { role: 'DOCTOR', doctorId: doc1Id },
            params: { id: booking1Id },
            body: { testId: 99999 }
        };
        res = mockRes();
        await doctorController.suggestTest(req, res);
        assert(res.statusCode === 404, '6. POST /doctor/appointments/:id/tests with invalid testId returns 404 Not Found');

        console.log('\n--- SECTION 3: DOCTOR & PATIENT TEST QUERY ENDPOINTS ---');

        // Test 7: Doctor fetch appointment tests
        req = { user: { role: 'DOCTOR', doctorId: doc1Id }, params: { id: booking1Id } };
        res = mockRes();
        await doctorController.getAppointmentTests(req, res);
        assert(res.statusCode === 200 && Array.isArray(res.body) && res.body.length === 1 && res.body[0].testId === 1, '7. GET /doctor/appointments/:id/tests returns assigned tests array');

        // Test 8: Unassigned Doctor fetch appointment tests rejection
        req = { user: { role: 'DOCTOR', doctorId: doc2Id }, params: { id: booking1Id } };
        res = mockRes();
        await doctorController.getAppointmentTests(req, res);
        assert(res.statusCode === 403, '8. GET /doctor/appointments/:id/tests by unassigned doctor returns 403 Forbidden');

        // Test 9: Patient fetch my tests
        req = { user: { role: 'PATIENT', patientId: pat1Id } };
        res = mockRes();
        await patientController.getMyTests(req, res);
        assert(res.statusCode === 200 && Array.isArray(res.body) && res.body.length === 1 && res.body[0].testId === 1, '9. GET /patients/me/tests returns patient suggested tests');

        // Test 10: Non-patient role fetch patient tests rejection
        req = { user: { role: 'DOCTOR', doctorId: doc1Id } };
        res = mockRes();
        await patientController.getMyTests(req, res);
        assert(res.statusCode === 403, '10. GET /patients/me/tests by DOCTOR role returns 403 Forbidden');

        // Test 11: Patient fetch single appointment tests
        req = { user: { role: 'PATIENT', patientId: pat1Id }, params: { id: booking1Id } };
        res = mockRes();
        await patientController.getMyAppointmentTests(req, res);
        assert(res.statusCode === 200 && Array.isArray(res.body) && res.body.length === 1, '11. GET /patients/me/appointments/:id/tests returns tests for patient appointment');

        // Test 12: Cross-patient appointment tests rejection
        req = { user: { role: 'PATIENT', patientId: pat2Id }, params: { id: booking1Id } };
        res = mockRes();
        await patientController.getMyAppointmentTests(req, res);
        assert(res.statusCode === 403, '12. GET /patients/me/appointments/:id/tests by wrong patient returns 403 Forbidden');

        console.log('\n--- SECTION 4: TEST REMOVAL & CLINICAL SAFETY ---');

        // Doctor 1 suggests testId 2 for Booking 1
        req = {
            user: { role: 'DOCTOR', doctorId: doc1Id },
            params: { id: booking1Id },
            body: { testId: 2 }
        };
        res = mockRes();
        await doctorController.suggestTest(req, res);

        // Test 13: Remove suggested test successfully
        req = {
            user: { role: 'DOCTOR', doctorId: doc1Id },
            params: { id: booking1Id, testId: 2 }
        };
        res = mockRes();
        await doctorController.removeTest(req, res);
        assert(res.statusCode === 200, '13. DELETE /doctor/appointments/:id/tests/:testId by assigned doctor removes test');

        // Test 14: Cross-doctor remove test rejection
        req = {
            user: { role: 'DOCTOR', doctorId: doc2Id },
            params: { id: booking1Id, testId: 1 }
        };
        res = mockRes();
        await doctorController.removeTest(req, res);
        assert(res.statusCode === 403, '14. DELETE /doctor/appointments/:id/tests/:testId by unassigned doctor returns 403 Forbidden');

        // Test 15: Deletion safety when clinical result exists
        // Insert a dummy test result row for test 1 of booking 1
        const [atRows] = await pool.query('SELECT id FROM appointment_tests WHERE booking_id = ? AND test_id = 1', [booking1Id]);
        const apptTestId = atRows[0].id;
        await pool.query('INSERT INTO test_results (appointment_test_id, result_value, notes) VALUES (?, ?, ?)', [apptTestId, 'Normal Range: 14.2 g/dL', 'Routine checkup completed']);

        req = {
            user: { role: 'DOCTOR', doctorId: doc1Id },
            params: { id: booking1Id, testId: 1 }
        };
        res = mockRes();
        await doctorController.removeTest(req, res);
        assert(res.statusCode === 409 && res.body.error.includes('associated clinical result'), '15. DELETE test with active result row fails with 409 Conflict (Clinical Safety)');

        console.log(`\n========================================`);
        console.log(`FINAL RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error('Fatal Error during test execution:', err);
    } finally {
        await pool.end();
    }
}

runTests();
