const pool = require('../config/mysql');
const { formatDateToISO, formatTimeFromMySQL } = require('../utils/formatters');

/**
 * Helper: Query appointment_tests JOIN tests LEFT JOIN test_results
 */
async function fetchAppointmentTests(bookingId) {
    const [rows] = await pool.query(
        `SELECT 
            at.id AS appointment_test_id,
            at.booking_id,
            at.test_id,
            at.instructions,
            at.status,
            at.created_at,
            t.test_code,
            t.name AS test_name,
            t.category,
            t.description,
            tr.id AS result_id,
            tr.result_value,
            tr.notes AS result_notes,
            tr.performed_at
        FROM appointment_tests at
        JOIN tests t ON at.test_id = t.id
        LEFT JOIN test_results tr ON tr.appointment_test_id = at.id
        WHERE at.booking_id = ?
        ORDER BY at.id ASC`,
        [bookingId]
    );

    return rows.map(r => ({
        id: r.appointment_test_id,
        bookingId: r.booking_id,
        testId: r.test_id,
        testCode: r.test_code,
        name: r.test_name,
        category: r.category,
        description: r.description,
        instructions: r.instructions,
        status: r.status,
        createdAt: r.created_at,
        result: r.result_id ? {
            id: r.result_id,
            value: r.result_value,
            notes: r.result_notes,
            performedAt: r.performed_at
        } : null
    }));
}

// GET /doctor/tests (Clinical Test Catalog)
exports.getTestCatalog = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.doctorId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Access restricted to doctors' });
        }

        const [rows] = await pool.query(
            'SELECT id, test_code, name, category, description, created_at FROM tests ORDER BY id ASC'
        );
        res.json(rows.map(r => ({
            id: r.id,
            testCode: r.test_code,
            name: r.name,
            category: r.category,
            description: r.description,
            createdAt: r.created_at
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /doctor/appointments (Doctor's Assigned Appointments)
exports.getDoctorAppointments = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.doctorId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Access restricted to doctors' });
        }

        const [rows] = await pool.query(
            `SELECT 
                b.id AS booking_id,
                b.status,
                b.expires_at,
                b.created_at AS booking_created_at,
                p.id AS patient_id,
                p.name AS patient_name,
                p.patient_code,
                s.id AS slot_id,
                s.doctor_id,
                s.slot_date,
                s.slot_time,
                d.name AS doctor_name,
                d.specialization,
                d.doctor_code
            FROM bookings b
            JOIN appointment_slots s ON b.slot_id = s.id
            JOIN patients p ON b.patient_id = p.id
            JOIN doctors d ON s.doctor_id = d.id
            WHERE s.doctor_id = ?
            ORDER BY s.slot_date DESC, s.slot_time DESC, b.id DESC`,
            [req.user.doctorId]
        );

        const appointments = rows.map(row => ({
            _id: String(row.booking_id),
            id: row.booking_id,
            bookingRef: `BK-${String(row.booking_id).padStart(6, '0')}`,
            patientId: row.patient_id,
            patientName: row.patient_name,
            patientCode: row.patient_code,
            doctorId: String(row.doctor_id),
            doctorName: row.doctor_name,
            doctorCode: row.doctor_code,
            specialization: row.specialization,
            status: row.status,
            expiresAt: row.expires_at,
            createdAt: row.booking_created_at,
            date: formatDateToISO(row.slot_date),
            time: formatTimeFromMySQL(row.slot_time),
            slotId: String(row.slot_id)
        }));

        res.json(appointments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /doctor/appointments/:id (Doctor Single Appointment Consultation Inspection)
exports.getDoctorAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.doctorId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Access restricted to doctors' });
        }

        const [rows] = await pool.query(
            `SELECT 
                b.id AS booking_id,
                b.status,
                b.expires_at,
                b.created_at AS booking_created_at,
                p.id AS patient_id,
                p.name AS patient_name,
                p.patient_code,
                s.id AS slot_id,
                s.doctor_id,
                s.slot_date,
                s.slot_time,
                d.name AS doctor_name,
                d.specialization,
                d.doctor_code
            FROM bookings b
            JOIN appointment_slots s ON b.slot_id = s.id
            JOIN patients p ON b.patient_id = p.id
            JOIN doctors d ON s.doctor_id = d.id
            WHERE b.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const row = rows[0];

        // Authorize ownership: Doctor can only view appointments assigned to their doctorId (Admin can view any)
        if (req.user.role === 'DOCTOR' && Number(row.doctor_id) !== Number(req.user.doctorId)) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view another doctor\'s appointment.' });
        }

        const tests = await fetchAppointmentTests(row.booking_id);

        const response = {
            _id: String(row.booking_id),
            id: row.booking_id,
            bookingRef: `BK-${String(row.booking_id).padStart(6, '0')}`,
            patientId: row.patient_id,
            patientName: row.patient_name,
            patientCode: row.patient_code,
            doctorId: String(row.doctor_id),
            doctorName: row.doctor_name,
            doctorCode: row.doctor_code,
            specialization: row.specialization,
            status: row.status,
            expiresAt: row.expires_at,
            createdAt: row.booking_created_at,
            date: formatDateToISO(row.slot_date),
            time: formatTimeFromMySQL(row.slot_time),
            slotId: String(row.slot_id),
            tests
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /doctor/appointments/:id/tests (Suggest Clinical Test)
exports.suggestTest = async (req, res) => {
    try {
        const { id } = req.params; // booking_id
        const { testId, instructions } = req.body;

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.doctorId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Access restricted to doctors' });
        }

        if (!testId) {
            return res.status(400).json({ error: 'testId is required' });
        }

        // 1. Verify booking existence & doctor ownership
        const [bookings] = await pool.query(
            `SELECT b.id, b.status, s.doctor_id 
             FROM bookings b 
             JOIN appointment_slots s ON b.slot_id = s.id 
             WHERE b.id = ?`,
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const booking = bookings[0];
        if (req.user.role === 'DOCTOR' && Number(booking.doctor_id) !== Number(req.user.doctorId)) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to modify another doctor\'s appointment.' });
        }

        // 2. Verify test exists in catalog
        const [tests] = await pool.query('SELECT id, test_code, name, category, description FROM tests WHERE id = ?', [testId]);
        if (tests.length === 0) {
            return res.status(404).json({ error: 'Test not found in catalog' });
        }

        // 3. Check for existing test suggestion for this booking
        const [existing] = await pool.query(
            'SELECT id FROM appointment_tests WHERE booking_id = ? AND test_id = ?',
            [id, testId]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Test is already suggested for this appointment' });
        }

        // 4. Insert appointment_tests record
        const [insertRes] = await pool.query(
            'INSERT INTO appointment_tests (booking_id, test_id, instructions, status) VALUES (?, ?, ?, ?)',
            [id, testId, instructions || null, 'SUGGESTED']
        );

        const newApptTestId = insertRes.insertId;

        // Fetch inserted test detail
        const [insertedRows] = await pool.query(
            `SELECT 
                at.id AS appointment_test_id,
                at.booking_id,
                at.test_id,
                at.instructions,
                at.status,
                at.created_at,
                t.test_code,
                t.name AS test_name,
                t.category,
                t.description
             FROM appointment_tests at
             JOIN tests t ON at.test_id = t.id
             WHERE at.id = ?`,
            [newApptTestId]
        );

        const row = insertedRows[0];
        res.status(201).json({
            id: row.appointment_test_id,
            bookingId: row.booking_id,
            testId: row.test_id,
            testCode: row.test_code,
            name: row.test_name,
            category: row.category,
            description: row.description,
            instructions: row.instructions,
            status: row.status,
            createdAt: row.created_at,
            result: null
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(409).json({ error: 'Test is already suggested for this appointment' });
        }
        res.status(500).json({ error: error.message });
    }
};

// DELETE /doctor/appointments/:id/tests/:testId (Remove Clinical Test Suggestion)
exports.removeTest = async (req, res) => {
    try {
        const { id, testId } = req.params; // booking_id, test_id

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.doctorId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Access restricted to doctors' });
        }

        // 1. Verify booking existence & doctor ownership
        const [bookings] = await pool.query(
            `SELECT b.id, s.doctor_id 
             FROM bookings b 
             JOIN appointment_slots s ON b.slot_id = s.id 
             WHERE b.id = ?`,
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const booking = bookings[0];
        if (req.user.role === 'DOCTOR' && Number(booking.doctor_id) !== Number(req.user.doctorId)) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to modify another doctor\'s appointment.' });
        }

        // 2. Find appointment_test row
        const [apptTests] = await pool.query(
            'SELECT id FROM appointment_tests WHERE booking_id = ? AND test_id = ?',
            [id, testId]
        );

        if (apptTests.length === 0) {
            return res.status(404).json({ error: 'Suggested test not found for this appointment' });
        }

        const apptTestId = apptTests[0].id;

        // 3. Check if test_results exists for this appointment_test_id
        const [results] = await pool.query(
            'SELECT id FROM test_results WHERE appointment_test_id = ?',
            [apptTestId]
        );

        if (results.length > 0) {
            return res.status(409).json({ error: 'Cannot remove test that already has an associated clinical result.' });
        }

        // 4. Delete row safely
        await pool.query('DELETE FROM appointment_tests WHERE id = ?', [apptTestId]);

        res.json({ message: 'Clinical test suggestion removed successfully' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /doctor/appointments/:id/tests (Get Tests for an Appointment)
exports.getAppointmentTests = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.doctorId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Access restricted to doctors' });
        }

        // Verify booking & doctor ownership
        const [bookings] = await pool.query(
            `SELECT b.id, s.doctor_id 
             FROM bookings b 
             JOIN appointment_slots s ON b.slot_id = s.id 
             WHERE b.id = ?`,
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const booking = bookings[0];
        if (req.user.role === 'DOCTOR' && Number(booking.doctor_id) !== Number(req.user.doctorId)) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view another doctor\'s appointment.' });
        }

        const tests = await fetchAppointmentTests(id);
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports.fetchAppointmentTests = fetchAppointmentTests;
