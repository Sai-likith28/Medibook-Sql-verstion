const cron = require('node-cron');
const pool = require('../config/mysql');

// Run every minute
const job = cron.schedule('* * * * *', async () => {
    console.log('Running expiry check...');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Find pending bookings older than 2 minutes
        const [expiredBookings] = await connection.query(
            `SELECT id, slot_id 
             FROM bookings 
             WHERE status = 'PENDING' AND created_at < TIMESTAMPADD(MINUTE, -2, NOW())
             FOR UPDATE`
        );

        if (expiredBookings.length === 0) {
            await connection.commit();
            return;
        }

        console.log(`Found ${expiredBookings.length} expired bookings.`);

        const bookingIds = expiredBookings.map(b => b.id);
        const slotIds = expiredBookings.map(b => b.slot_id);

        // 1. Mark bookings as FAILED
        await connection.query(
            `UPDATE bookings SET status = 'FAILED' WHERE id IN (?)`,
            [bookingIds]
        );

        // 2. Free up the slots
        await connection.query(
            `UPDATE appointment_slots SET is_booked = 0 WHERE id IN (?)`,
            [slotIds]
        );

        await connection.commit();
        console.log('Expired bookings processed successfully.');

    } catch (error) {
        console.error('Error in expiry service:', error);
        await connection.rollback();
    } finally {
        connection.release();
    }
});

module.exports = job;
