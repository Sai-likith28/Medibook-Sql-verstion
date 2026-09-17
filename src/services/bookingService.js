const pool = require('../config/mysql');
const { formatBooking } = require('../utils/formatters');

exports.bookSlot = async (slotId, patientName, patientIdOverride = null) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Find the slot and lock it with SELECT ... FOR UPDATE
        const [slots] = await connection.query(
            'SELECT id, doctor_id, slot_date, slot_time, is_booked FROM appointment_slots WHERE id = ? FOR UPDATE',
            [slotId]
        );

        if (slots.length === 0 || slots[0].is_booked === 1) {
            await connection.rollback();
            return { success: false, message: 'Slot not available' };
        }

        // 2. Atomically mark the slot as booked
        await connection.query(
            'UPDATE appointment_slots SET is_booked = 1 WHERE id = ?',
            [slotId]
        );

        // 3. Resolve Patient Identity
        let patientId;
        let resolvedPatientName = patientName ? patientName.trim() : 'Patient';

        if (patientIdOverride) {
            patientId = Number(patientIdOverride);
            const [pats] = await connection.query('SELECT name FROM patients WHERE id = ?', [patientId]);
            if (pats.length > 0 && pats[0].name) {
                resolvedPatientName = pats[0].name;
            }
        } else {
            const [patients] = await connection.query(
                'SELECT id FROM patients WHERE name = ? LIMIT 1',
                [resolvedPatientName]
            );

            if (patients.length > 0) {
                patientId = patients[0].id;
            } else {
                const [insertPatientResult] = await connection.query(
                    'INSERT INTO patients (name) VALUES (?)',
                    [resolvedPatientName]
                );
                patientId = insertPatientResult.insertId;
            }
        }

        // 4. Create the booking with status CONFIRMED
        const [insertBookingResult] = await connection.query(
            'INSERT INTO bookings (slot_id, patient_id, status, expires_at) VALUES (?, ?, ?, NULL)',
            [slotId, patientId, 'CONFIRMED']
        );

        const bookingId = insertBookingResult.insertId;

        const [bookingRows] = await connection.query(
            'SELECT id, slot_id, patient_id, status, expires_at, created_at FROM bookings WHERE id = ?',
            [bookingId]
        );

        await connection.commit();

        const bookingData = {
            ...bookingRows[0],
            patient_name: resolvedPatientName
        };

        return {
            success: true,
            booking: formatBooking(bookingData)
        };

    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return { success: false, message: 'Slot not available' };
        }
        throw error;
    } finally {
        connection.release();
    }
};
