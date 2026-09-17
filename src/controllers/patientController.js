const pool = require('../config/mysql');
const bookingService = require('../services/bookingService');
const { formatDoctor, formatSlot, formatDateToISO, formatTimeFromMySQL } = require('../utils/formatters');

// Get all doctors
exports.getAllDoctors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, specialization, created_at FROM doctors ORDER BY id ASC');
        res.json(rows.map(formatDoctor));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get slots for a doctor
exports.getDoctorSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT id, doctor_id, slot_date, slot_time, is_booked, created_at FROM appointment_slots WHERE doctor_id = ? ORDER BY slot_date ASC, slot_time ASC',
            [id]
        );
        res.json(rows.map(formatSlot));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Book a slot (supports both authenticated patient & public booking)
exports.bookSlot = async (req, res) => {
    try {
        const { slotId, patientName } = req.body;

        let patientIdOverride = null;
        let finalPatientName = patientName;

        // If request is authenticated as PATIENT, derive patient ID strictly from req.user
        if (req.user && req.user.role === 'PATIENT') {
            if (!req.user.patientId) {
                return res.status(403).json({ error: 'Authenticated patient record not found.' });
            }
            patientIdOverride = req.user.patientId;
            finalPatientName = req.user.name || patientName || 'Patient';
        } else {
            if (!slotId || !patientName || !patientName.trim()) {
                return res.status(400).json({ error: 'slotId and patientName are required' });
            }
        }

        if (!slotId) {
            return res.status(400).json({ error: 'slotId is required' });
        }

        const result = await bookingService.bookSlot(slotId, finalPatientName, patientIdOverride);

        if (!result.success) {
            return res.status(409).json({ error: result.message });
        }

        res.status(201).json(result.booking);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /patients/me/appointments (Authenticated Patient's Appointment History)
exports.getMyAppointments = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Patient authentication required' });
        }
        if (!req.user.patientId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Requires PATIENT role' });
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
            JOIN patients p ON b.patient_id = p.id
            JOIN appointment_slots s ON b.slot_id = s.id
            LEFT JOIN doctors d ON s.doctor_id = d.id
            WHERE b.patient_id = ?
            ORDER BY s.slot_date DESC, s.slot_time DESC, b.id DESC`,
            [req.user.patientId]
        );

        const bookings = rows.map(row => ({
            _id: String(row.booking_id),
            id: row.booking_id,
            bookingRef: `BK-${String(row.booking_id).padStart(6, '0')}`,
            patientId: row.patient_id,
            patientName: row.patient_name,
            patientCode: row.patient_code,
            doctorId: String(row.doctor_id),
            doctorName: row.doctor_name || 'Unknown Doctor',
            doctorCode: row.doctor_code,
            specialization: row.specialization || 'General',
            status: row.status,
            expiresAt: row.expires_at,
            createdAt: row.booking_created_at,
            date: formatDateToISO(row.slot_date),
            time: formatTimeFromMySQL(row.slot_time),
            slotId: String(row.slot_id)
        }));

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /patients/me/appointments/:id (Authenticated Patient Single Appointment Inspection)
exports.getMyAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!req.user.patientId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Requires PATIENT role' });
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
            JOIN patients p ON b.patient_id = p.id
            JOIN appointment_slots s ON b.slot_id = s.id
            LEFT JOIN doctors d ON s.doctor_id = d.id
            WHERE b.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const row = rows[0];

        // Authorize ownership: Patient can only view their own booking (Admin can view any)
        if (req.user.role === 'PATIENT' && Number(row.patient_id) !== Number(req.user.patientId)) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view this appointment.' });
        }

        const response = {
            _id: String(row.booking_id),
            id: row.booking_id,
            bookingRef: `BK-${String(row.booking_id).padStart(6, '0')}`,
            patientId: row.patient_id,
            patientName: row.patient_name,
            patientCode: row.patient_code,
            doctorId: String(row.doctor_id),
            doctorName: row.doctor_name || 'Unknown Doctor',
            doctorCode: row.doctor_code,
            specialization: row.specialization || 'General',
            status: row.status,
            expiresAt: row.expires_at,
            createdAt: row.booking_created_at,
            date: formatDateToISO(row.slot_date),
            time: formatTimeFromMySQL(row.slot_time),
            slotId: String(row.slot_id),
            tests: await fetchAppointmentTests(row.booking_id)
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

// GET /patients/me/tests (Authenticated Patient's Suggested Tests across all appointments)
exports.getMyTests = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Patient authentication required' });
        }
        if (!req.user.patientId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Requires PATIENT role' });
        }

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
                tr.performed_at,
                s.slot_date,
                s.slot_time,
                d.name AS doctor_name
            FROM bookings b
            JOIN appointment_tests at ON at.booking_id = b.id
            JOIN tests t ON at.test_id = t.id
            LEFT JOIN test_results tr ON tr.appointment_test_id = at.id
            JOIN appointment_slots s ON b.slot_id = s.id
            LEFT JOIN doctors d ON s.doctor_id = d.id
            WHERE b.patient_id = ?
            ORDER BY at.id DESC`,
            [req.user.patientId]
        );

        const tests = rows.map(r => ({
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
            doctorName: r.doctor_name || 'Unknown Doctor',
            slotDate: formatDateToISO(r.slot_date),
            result: r.result_id ? {
                id: r.result_id,
                value: r.result_value,
                notes: r.result_notes,
                performedAt: r.performed_at
            } : null
        }));

        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /patients/me/appointments/:id/tests (Authenticated Patient Single Appointment Tests)
exports.getMyAppointmentTests = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ error: 'Patient authentication required' });
        }
        if (!req.user.patientId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Requires PATIENT role' });
        }

        // Check if booking belongs to patient
        const [bookings] = await pool.query(
            `SELECT patient_id FROM bookings WHERE id = ?`,
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (req.user.role === 'PATIENT' && Number(bookings[0].patient_id) !== Number(req.user.patientId)) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view tests for this appointment.' });
        }

        const tests = await fetchAppointmentTests(id);
        res.json(tests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get booking details (Public Lookup)
exports.getBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT 
                b.id AS booking_id,
                b.status,
                b.expires_at,
                b.created_at AS booking_created_at,
                p.name AS patient_name,
                s.id AS slot_id,
                s.doctor_id,
                s.slot_date,
                s.slot_time,
                s.is_booked,
                s.created_at AS slot_created_at,
                d.name AS doctor_name,
                d.specialization
            FROM bookings b
            JOIN patients p ON b.patient_id = p.id
            JOIN appointment_slots s ON b.slot_id = s.id
            LEFT JOIN doctors d ON s.doctor_id = d.id
            WHERE b.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const row = rows[0];
        const response = {
            _id: String(row.booking_id),
            id: row.booking_id,
            patientName: row.patient_name,
            doctorName: row.doctor_name || 'Unknown Doctor',
            specialization: row.specialization || 'General',
            status: row.status,
            expiresAt: row.expires_at,
            createdAt: row.booking_created_at,
            slotId: {
                _id: String(row.slot_id),
                id: row.slot_id,
                doctorId: String(row.doctor_id),
                date: formatDateToISO(row.slot_date),
                time: formatTimeFromMySQL(row.slot_time),
                isBooked: Boolean(row.is_booked),
                createdAt: row.slot_created_at
            }
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
