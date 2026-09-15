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

// Book a slot
exports.bookSlot = async (req, res) => {
    try {
        const { slotId, patientName } = req.body;

        if (!slotId || !patientName || !patientName.trim()) {
            return res.status(400).json({ error: 'slotId and patientName are required' });
        }

        const result = await bookingService.bookSlot(slotId, patientName);

        if (!result.success) {
            return res.status(409).json({ error: result.message }); // 409 Conflict
        }

        res.status(201).json(result.booking);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get booking details
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
