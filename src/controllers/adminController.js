const pool = require('../config/mysql');
const bcrypt = require('bcryptjs');
const { formatDoctor, formatSlot, normalizeDateToMySQL, normalizeTimeToMySQL } = require('../utils/formatters');

// Create a new doctor with authenticated user account & temporary password
exports.createDoctor = async (req, res) => {
    try {
        const { name, specialization, email, password } = req.body;
        if (!name || !name.trim() || !specialization || !specialization.trim()) {
            return res.status(400).json({ error: 'Name and specialization are required' });
        }

        const trimmedName = name.trim();
        const trimmedSpec = specialization.trim();
        const trimmedEmail = email ? email.trim() : null;

        // Generate temporary password if not provided
        const tempPassword = password && password.trim() 
            ? password.trim() 
            : `Doc${Math.floor(100000 + Math.random() * 900000)}!`;

        const passwordHash = bcrypt.hashSync(tempPassword, 10);

        // First insert into doctors to get auto-increment id
        const [docResult] = await pool.query(
            'INSERT INTO doctors (name, specialization, email) VALUES (?, ?, ?)',
            [trimmedName, trimmedSpec, trimmedEmail]
        );
        const doctorId = docResult.insertId;

        // Determine unique doctor_code (e.g. D-000001, D-000002)
        const doctorCode = `D-${String(doctorId).padStart(6, '0')}`;

        // Insert into users
        const [userResult] = await pool.query(
            "INSERT INTO users (login_id, password_hash, role, status) VALUES (?, ?, 'DOCTOR', 'ACTIVE')",
            [doctorCode, passwordHash]
        );
        const userId = userResult.insertId;

        // Link doctor record with user_id & doctor_code
        await pool.query(
            'UPDATE doctors SET user_id = ?, doctor_code = ? WHERE id = ?',
            [userId, doctorCode, doctorId]
        );

        const [rows] = await pool.query(
            'SELECT id, doctor_code, name, specialization, email, created_at FROM doctors WHERE id = ?',
            [doctorId]
        );

        const doctorObj = formatDoctor(rows[0]);

        res.status(201).json({
            ...doctorObj,
            doctorCode,
            loginId: doctorCode,
            tempPassword, // Returned ONCE to admin upon creation
            message: 'Doctor account created successfully. Please convey the temporary password to the doctor.'
        });
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
