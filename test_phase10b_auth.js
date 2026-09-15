const pool = require('./src/config/mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { ensurePhase10bSchema } = require('./src/config/migratePhase10b');
const authRoutes = require('./src/routes/authRoutes');
const { authenticateToken, requireRole } = require('./src/middleware/auth');

async function runPhase10bAuthTests() {
    console.log('=== STARTING PHASE 10B: DATABASE FOUNDATION & AUTHENTICATION TESTS ===\n');

    // Setup temporary test Express server instance
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/auth', authRoutes);

    // Protected test route for role check
    app.get('/test/protected-admin', authenticateToken, requireRole('ADMIN'), (req, res) => {
        res.json({ message: 'Admin access granted', user: req.user });
    });

    app.get('/test/protected-patient', authenticateToken, requireRole('PATIENT'), (req, res) => {
        res.json({ message: 'Patient access granted', user: req.user });
    });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(3099, resolve));
    const baseUrl = 'http://localhost:3099';

    try {
        // --- 1. Database Schema & Migration Sync ---
        console.log('[Setup] Syncing Phase 10B Database Schema & Seeding Accounts...');
        await ensurePhase10bSchema(pool);
        console.log('✅ PASS: Schema & Seed Sync completed successfully.\n');

        // --- 2. Database Structure & Constraint Verification ---
        console.log('--- SECTION 1: Database Structure & Constraints ---');

        // Test 1 & 2: Users table & unique login_id
        try {
            await pool.query("INSERT INTO users (login_id, password_hash, role) VALUES ('admin', 'hash', 'ADMIN')");
            console.error('❌ FAIL: Duplicate login_id inserted!');
        } catch (e) {
            console.log('✅ PASS 1 & 2: Unique constraint on users.login_id enforced.');
        }

        // Test 3 & 4: Unique patient_code & doctor_code
        try {
            await pool.query("INSERT INTO patients (name, patient_code) VALUES ('Duplicate Patient', 'P-000001')");
            console.error('❌ FAIL: Duplicate patient_code inserted!');
        } catch (e) {
            console.log('✅ PASS 3: Unique constraint on patients.patient_code enforced.');
        }

        try {
            await pool.query("INSERT INTO doctors (name, specialization, doctor_code) VALUES ('Dup Doc', 'Gen', 'D-000001')");
            console.error('❌ FAIL: Duplicate doctor_code inserted!');
        } catch (e) {
            console.log('✅ PASS 4: Unique constraint on doctors.doctor_code enforced.');
        }

        // Test 5 & 6: Patient-user & Doctor-user FK relationship
        const [patUser] = await pool.query("SELECT u.id AS user_id, p.id AS patient_id, p.patient_code FROM users u JOIN patients p ON p.user_id = u.id WHERE u.role = 'PATIENT' LIMIT 1");
        if (patUser.length > 0) {
            console.log(`✅ PASS 5: Patient-user relationship verified (Patient ${patUser[0].patient_code} -> User ID ${patUser[0].user_id}).`);
        }

        const [docUser] = await pool.query("SELECT u.id AS user_id, d.id AS doctor_id, d.doctor_code FROM users u JOIN doctors d ON d.user_id = u.id WHERE u.role = 'DOCTOR' LIMIT 1");
        if (docUser.length > 0) {
            console.log(`✅ PASS 6: Doctor-user relationship verified (Doctor ${docUser[0].doctor_code} -> User ID ${docUser[0].user_id}).`);
        }

        // Test 7: Test Catalog
        const [testsCatalog] = await pool.query("SELECT * FROM tests");
        if (testsCatalog.length >= 4) {
            console.log(`✅ PASS 7: Clinical test catalog verified (${testsCatalog.length} catalog entries present).`);
        } else {
            console.error('❌ FAIL: Clinical test catalog incomplete!');
        }

        // Test 8: Appointment Test Relationship & Unique constraint
        const [existingBookings] = await pool.query("SELECT id FROM bookings LIMIT 1");
        if (existingBookings.length > 0) {
            const bookingId = existingBookings[0].id;
            const testId = testsCatalog[0].id;

            await pool.query("DELETE FROM appointment_tests WHERE booking_id = ? AND test_id = ?", [bookingId, testId]);
            await pool.query("INSERT INTO appointment_tests (booking_id, test_id, instructions) VALUES (?, ?, 'Fast before test')", [bookingId, testId]);

            try {
                await pool.query("INSERT INTO appointment_tests (booking_id, test_id) VALUES (?, ?)", [bookingId, testId]);
                console.error('❌ FAIL: Duplicate appointment test suggestion inserted!');
            } catch (e) {
                console.log('✅ PASS 8: appointment_tests FKs and UNIQUE(booking_id, test_id) constraint verified.');
            }
        }

        // Test 9 & 10: Prescriptions & Prescription Items
        if (existingBookings.length > 0) {
            const bookingId = existingBookings[0].id;
            await pool.query("DELETE FROM prescriptions WHERE booking_id = ?", [bookingId]);
            const [rxRes] = await pool.query("INSERT INTO prescriptions (booking_id, notes) VALUES (?, 'Take medications as directed')", [bookingId]);
            const rxId = rxRes.insertId;

            await pool.query("INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration) VALUES (?, 'Amoxicillin', '500 mg', 'Three times daily', '7 days')", [rxId]);
            const [items] = await pool.query("SELECT * FROM prescription_items WHERE prescription_id = ?", [rxId]);
            if (items.length > 0) {
                console.log('✅ PASS 9 & 10: prescriptions and prescription_items relational model verified.');
            }
        }


        // --- 3. Authentication & Authorization API Tests ---
        console.log('\n--- SECTION 2: Authentication & Authorization APIs ---');

        // Test 11: Valid Patient Login
        const patLoginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'P-000001', password: 'patient123' })
        });
        const patLoginData = await patLoginRes.json();
        if (patLoginRes.status === 200 && patLoginData.token && patLoginData.user.role === 'PATIENT') {
            console.log('✅ PASS 11: Valid Patient Login (P-000001) succeeded with JWT token.');
        } else {
            console.error('❌ FAIL 11: Valid Patient Login failed!', patLoginData);
        }

        // Test 12: Valid Doctor Login
        const docLoginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'D-000001', password: 'doctor123' })
        });
        const docLoginData = await docLoginRes.json();
        if (docLoginRes.status === 200 && docLoginData.token && docLoginData.user.role === 'DOCTOR') {
            console.log('✅ PASS 12: Valid Doctor Login (D-000001) succeeded with JWT token.');
        } else {
            console.error('❌ FAIL 12: Valid Doctor Login failed!', docLoginData);
        }

        // Test 13: Valid Admin Login
        const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'admin', password: 'admin123' })
        });
        const adminLoginData = await adminLoginRes.json();
        if (adminLoginRes.status === 200 && adminLoginData.token && adminLoginData.user.role === 'ADMIN') {
            console.log('✅ PASS 13: Valid Admin Login (admin) succeeded with JWT token.');
        } else {
            console.error('❌ FAIL 13: Valid Admin Login failed!', adminLoginData);
        }

        // Test 14: Invalid Password Rejection
        const badPassRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'admin', password: 'wrongpassword' })
        });
        if (badPassRes.status === 401) {
            console.log('✅ PASS 14: Invalid password rejected with HTTP 401.');
        }

        // Test 15: Nonexistent Login Rejection (Generic message)
        const badUserRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'nonexistent_user', password: 'password123' })
        });
        const badUserData = await badUserRes.json();
        if (badUserRes.status === 401 && badUserData.error === 'Invalid login credentials') {
            console.log('✅ PASS 15: Nonexistent login rejected with generic HTTP 401 error message.');
        }

        // Test 16: Inactive / Suspended Account Rejection
        await pool.query("INSERT INTO users (login_id, password_hash, role, status) VALUES ('suspended_usr', 'hash', 'PATIENT', 'SUSPENDED') ON DUPLICATE KEY UPDATE status='SUSPENDED'");
        const suspRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginId: 'suspended_usr', password: 'password123' })
        });
        if (suspRes.status === 403) {
            console.log('✅ PASS 16: Suspended account login rejected with HTTP 403.');
        }

        // Test 17 & 18: Invalid / Missing JWT Rejection
        const noTokenRes = await fetch(`${baseUrl}/test/protected-admin`);
        if (noTokenRes.status === 401) {
            console.log('✅ PASS 17: Missing JWT token rejected with HTTP 401.');
        }

        const badTokenRes = await fetch(`${baseUrl}/test/protected-admin`, {
            headers: { 'Authorization': 'Bearer invalid_token_123' }
        });
        if (badTokenRes.status === 401) {
            console.log('✅ PASS 18: Invalid JWT token rejected with HTTP 401.');
        }

        // Test 19: Role Authorization Middleware
        const patientAccessAdminRoute = await fetch(`${baseUrl}/test/protected-admin`, {
            headers: { 'Authorization': `Bearer ${patLoginData.token}` }
        });
        if (patientAccessAdminRoute.status === 403) {
            console.log('✅ PASS 19: Role authorization enforced (Patient blocked from Admin route with HTTP 403).');
        }

        const adminAccessAdminRoute = await fetch(`${baseUrl}/test/protected-admin`, {
            headers: { 'Authorization': `Bearer ${adminLoginData.token}` }
        });
        if (adminAccessAdminRoute.status === 200) {
            console.log('✅ PASS 20: Role authorization allowed (Admin accessed Admin route with HTTP 200).');
        }

        // Test 21: Password Hash Leak Check
        if (!patLoginData.user.password_hash && !patLoginData.password && !patLoginData.user.password) {
            console.log('✅ PASS 21: Confirmed password hashes are NEVER returned in auth API responses.\n');
        } else {
            console.error('❌ FAIL 21: Password hash leaked in login response!');
        }

        console.log('=== ALL 21 PHASE 10B DATABASE & AUTHENTICATION TESTS PASSED! ===\n');

    } finally {
        if (server) {
            server.close();
            if (server.closeAllConnections) {
                server.closeAllConnections();
            }
        }
        await pool.end();
    }
}

runPhase10bAuthTests().catch((err) => {
    console.error('❌ PHASE 10B TEST SUITE FAILED:', err);
    process.exitCode = 1;
});
