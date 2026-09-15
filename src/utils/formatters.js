/**
 * Utility functions to handle date, time, and entity serialization 
 * for MySQL database mapping while preserving existing frontend API contracts.
 */

/**
 * Normalizes input time string to MySQL TIME format (HH:MM:SS)
 * Accepts: "09:00 AM", "02:30 PM", "14:30", "09:00", "09:00:00"
 */
function normalizeTimeToMySQL(timeStr) {
    if (!timeStr) return null;
    const str = timeStr.toString().trim();

    // Match "09:00 AM" or "02:30 PM"
    const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = ampmMatch[2];
        const period = ampmMatch[3].toUpperCase();
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${String(hours).padStart(2, '0')}:${minutes}:00`;
    }

    // Match "09:00" or "09:00:00"
    const hhmmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hhmmMatch) {
        const hours = String(parseInt(hhmmMatch[1], 10)).padStart(2, '0');
        const minutes = hhmmMatch[2];
        const seconds = hhmmMatch[3] || '00';
        return `${hours}:${minutes}:${seconds}`;
    }

    return str;
}

/**
 * Formats MySQL TIME value (e.g. "09:00:00") for frontend consumption.
 */
function formatTimeFromMySQL(timeStr) {
    if (!timeStr) return '';
    const str = timeStr.toString();
    const parts = str.split(':');
    if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return str;
}

/**
 * Normalizes input date to YYYY-MM-DD format for MySQL DATE column.
 */
function normalizeDateToMySQL(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
        return dateVal.toISOString().split('T')[0];
    }
    const str = dateVal.toString().trim();
    if (str.includes('T')) {
        return str.split('T')[0];
    }
    return str.substring(0, 10);
}

/**
 * Formats MySQL DATE value into ISO string expected by frontend Date parsing.
 */
function formatDateToISO(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
        return dateVal.toISOString();
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
        return d.toISOString();
    }
    return `${dateVal}T00:00:00.000Z`;
}

/**
 * Maps a MySQL doctor record to API response format
 */
function formatDoctor(row) {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: row.id,
        name: row.name,
        specialization: row.specialization,
        createdAt: row.created_at
    };
}

/**
 * Maps a MySQL slot record to API response format
 */
function formatSlot(row) {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: row.id,
        doctorId: String(row.doctor_id),
        date: formatDateToISO(row.slot_date),
        time: formatTimeFromMySQL(row.slot_time),
        isBooked: Boolean(row.is_booked),
        createdAt: row.created_at
    };
}

/**
 * Maps a MySQL booking record to API response format
 */
function formatBooking(row, slotDetail = null) {
    if (!row) return null;
    return {
        _id: String(row.id),
        id: row.id,
        slotId: slotDetail || String(row.slot_id),
        patientName: row.patient_name || row.patientName,
        status: row.status,
        expiresAt: row.expires_at || null,
        createdAt: row.created_at
    };
}

module.exports = {
    normalizeTimeToMySQL,
    formatTimeFromMySQL,
    normalizeDateToMySQL,
    formatDateToISO,
    formatDoctor,
    formatSlot,
    formatBooking
};
