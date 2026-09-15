const pool = require('../config/mysql');
const { formatDoctor, formatSlot, normalizeDateToMySQL, normalizeTimeToMySQL } = require('../utils/formatters');

// Create a new doctor
exports.createDoctor = async (req, res) => {
    try {
        const { name, specialization } = req.body;
        if (!name || !specialization) {
            return res.status(400).json({ error: 'Name and specialization are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO doctors (name, specialization) VALUES (?, ?)',
            [name.trim(), specialization.trim()]
        );

        const [rows] = await pool.query(
            'SELECT id, name, specialization, created_at FROM doctors WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(formatDoctor(rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all doctors
exports.getDoctors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, specialization, created_at FROM doctors ORDER BY id ASC');
        res.json(rows.map(formatDoctor));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a slot
exports.createSlot = async (req, res) => {
    try {
        const { doctorId, date, time } = req.body;
        if (!doctorId || !date || !time) {
            return res.status(400).json({ error: 'doctorId, date, and time are required' });
        }

        // Basic validation to check if doctor exists
        const [doctorRows] = await pool.query('SELECT id FROM doctors WHERE id = ?', [doctorId]);
        if (doctorRows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const slotDate = normalizeDateToMySQL(date);
        const slotTime = normalizeTimeToMySQL(time);

        const [result] = await pool.query(
            'INSERT INTO appointment_slots (doctor_id, slot_date, slot_time, is_booked) VALUES (?, ?, ?, 0)',
            [doctorId, slotDate, slotTime]
        );

        const [slotRows] = await pool.query(
            'SELECT id, doctor_id, slot_date, slot_time, is_booked, created_at FROM appointment_slots WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(formatSlot(slotRows[0]));
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({ error: 'Slot already exists for this doctor at this time' });
        }
        res.status(400).json({ error: error.message });
    }
};

// Get slots (filter by doctorId)
exports.getSlots = async (req, res) => {
    try {
        const { doctorId } = req.query;
        let query = 'SELECT id, doctor_id, slot_date, slot_time, is_booked, created_at FROM appointment_slots';
        const params = [];

        if (doctorId) {
            query += ' WHERE doctor_id = ?';
            params.push(doctorId);
        }
        query += ' ORDER BY slot_date ASC, slot_time ASC';

        const [rows] = await pool.query(query, params);
        res.json(rows.map(formatSlot));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
