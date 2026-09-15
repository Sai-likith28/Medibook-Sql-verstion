const express = require('express');
const http = require('http');
const pool = require('./src/config/mysql');
const reportRoutes = require('./src/routes/reportRoutes');

async function runReportApiTests() {
    console.log('=== STARTING SQL REPORTING API VERIFICATION (Phase 9A) ===\n');

    // 1. Create a test Express server instance
    const app = express();
    app.use(express.json());
    app.use('/admin/reports', reportRoutes);

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    let testsPassed = 0;
    let testsTotal = 0;

    function assert(condition, message) {
        testsTotal++;
        if (!condition) {
            console.error(`❌ FAIL: ${message}`);
            throw new Error(`Test failed: ${message}`);
        } else {
            console.log(`✅ PASS: ${message}`);
            testsPassed++;
        }
    }

    // Helper for HTTP GET JSON
    function httpGet(path) {
        return new Promise((resolve, reject) => {
            http.get(`${baseUrl}${path}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, body: json });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: data });
                    }
                });
            }).on('error', reject);
        });
    }

    try {
        // Seed representative test data to ensure report endpoints return rows
        console.log('[Setup] Seeding test dataset...');
        const conn = await pool.getConnection();
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE booking_audit');
        await conn.query('TRUNCATE TABLE bookings');
        await conn.query('TRUNCATE TABLE appointment_slots');
        await conn.query('TRUNCATE TABLE patients');
        await conn.query('TRUNCATE TABLE doctors');
        await conn.query('SET FOREIGN_KEY_CHECKS = 1');

        const [doc] = await conn.query('INSERT INTO doctors (name, specialization) VALUES ("Dr. Sarah Connor", "Neurology")');
        const [pat] = await conn.query('INSERT INTO patients (name) VALUES ("Kyle Reese")');
        const today = new Date().toISOString().split('T')[0];
        const [slot] = await conn.query('INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, "10:00:00", 1)', [doc.insertId, today]);
        const [bk] = await conn.query('INSERT INTO bookings (slot_id, patient_id, status) VALUES (?, ?, "CONFIRMED")', [slot.insertId, pat.insertId]);
        await conn.query('INSERT INTO booking_audit (booking_id, old_status, new_status, action) VALUES (?, NULL, "CONFIRMED", "INSERT")', [bk.insertId]);
        conn.release();
        console.log('[Setup] Seeded dataset successfully.\n');

        // Test 1: List all reports endpoint GET /admin/reports
        console.log('--- Test 1: GET /admin/reports ---');
        const listRes = await httpGet('/admin/reports');
        assert(listRes.status === 200, 'GET /admin/reports returns HTTP 200');
        assert(Array.isArray(listRes.body.availableReports), 'GET /admin/reports returns availableReports array');
        assert(listRes.body.availableReports.length === 6, 'Contains 6 available reports');

        // Test 2: Test all 6 valid report endpoints
        const validReports = [
            'doctor-utilization',
            'daily-summary',
            'patient-activity',
            'peak-booking-time',
            'specialization-demand',
            'booking-audit-lifecycle'
        ];

        console.log('\n--- Test 2: Valid Report Endpoint Tests ---');
        for (const reportName of validReports) {
            const res = await httpGet(`/admin/reports/${reportName}`);
            assert(res.status === 200, `GET /admin/reports/${reportName} returns HTTP 200`);
            assert(res.body.report === reportName, `Response contains report identifier "${reportName}"`);
            assert(Array.isArray(res.body.data), `Response contains data array for "${reportName}"`);
            console.log(`   └─ Returned ${res.body.data.length} row(s)`);
        }

        // Test 3: Invalid report name error handling (HTTP 400)
        console.log('\n--- Test 3: Invalid Report Name Error Handling ---');
        const invalidReportNames = [
            'invalid-report-name',
            '../schema.sql',
            'SELECT * FROM doctors',
            'drop-table-bookings'
        ];

        for (const badName of invalidReportNames) {
            const res = await httpGet(`/admin/reports/${encodeURIComponent(badName)}`);
            assert(res.status === 400, `GET /admin/reports/${badName} returns HTTP 400`);
            assert(res.body.error === 'Invalid report name', `Returns error message "Invalid report name"`);
        }

        // Test 4: Read-Only Database Safety Verification
        console.log('\n--- Test 4: Read-Only Database Safety Verification ---');
        
        async function getTableRowCounts() {
            const [docRows] = await pool.query('SELECT COUNT(*) as cnt FROM doctors');
            const [patRows] = await pool.query('SELECT COUNT(*) as cnt FROM patients');
            const [slotRows] = await pool.query('SELECT COUNT(*) as cnt FROM appointment_slots');
            const [bkRows] = await pool.query('SELECT COUNT(*) as cnt FROM bookings');
            const [auditRows] = await pool.query('SELECT COUNT(*) as cnt FROM booking_audit');
            return {
                doctors: docRows[0].cnt,
                patients: patRows[0].cnt,
                appointment_slots: slotRows[0].cnt,
                bookings: bkRows[0].cnt,
                booking_audit: auditRows[0].cnt
            };
        }

        const countsBefore = await getTableRowCounts();
        console.log('Row counts BEFORE executing report APIs:', countsBefore);

        // Execute all report endpoints multiple times
        for (let i = 0; i < 3; i++) {
            for (const reportName of validReports) {
                await httpGet(`/admin/reports/${reportName}`);
            }
        }

        const countsAfter = await getTableRowCounts();
        console.log('Row counts AFTER executing report APIs:', countsAfter);

        assert(countsBefore.doctors === countsAfter.doctors, 'Doctors table count unchanged');
        assert(countsBefore.patients === countsAfter.patients, 'Patients table count unchanged');
        assert(countsBefore.appointment_slots === countsAfter.appointment_slots, 'Appointment slots table count unchanged');
        assert(countsBefore.bookings === countsAfter.bookings, 'Bookings table count unchanged');
        assert(countsBefore.booking_audit === countsAfter.booking_audit, 'Booking audit table count unchanged');

        console.log(`\n=== ALL ${testsPassed} PHASE 9A TESTS PASSED SUCCESSFULLY! ===`);

    } catch (err) {
        console.error('\n!!! PHASE 9A TEST SUITE FAILED !!!', err);
        process.exitCode = 1;
    } finally {
        server.close();
        process.exit(process.exitCode || 0);
    }
}

runReportApiTests();
