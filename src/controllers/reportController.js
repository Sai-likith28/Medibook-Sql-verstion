const fs = require('fs');
const path = require('path');
const pool = require('../config/mysql');

// Whitelist of valid report names mapped to SQL filenames
const REPORT_FILES = {
    'doctor-utilization': 'doctor_utilization.sql',
    'daily-summary': 'daily_summary.sql',
    'patient-activity': 'patient_activity.sql',
    'peak-booking-time': 'peak_booking_time.sql',
    'specialization-demand': 'specialization_demand.sql',
    'booking-audit-lifecycle': 'booking_audit_lifecycle.sql'
};

/**
 * GET /admin/reports/:reportName
 * Fetches and executes a whitelisted SQL analytical report query.
 */
exports.getReportByName = async (req, res) => {
    try {
        const { reportName } = req.params;

        // 1. Strict Whitelist Validation & SQL Injection Prevention
        if (!reportName || !REPORT_FILES[reportName]) {
            return res.status(400).json({ error: 'Invalid report name' });
        }

        const fileName = REPORT_FILES[reportName];
        const filePath = path.join(__dirname, '../../database/reports', fileName);

        // 2. Read report SQL file
        if (!fs.existsSync(filePath)) {
            console.error(`Report file missing: ${filePath}`);
            return res.status(500).json({ error: 'Failed to generate report' });
        }

        const rawSql = fs.readFileSync(filePath, 'utf8');

        // 3. Strip USE <database> line for node mysql2 execution compatibility
        const cleanQuery = rawSql.replace(/^USE\s+\w+;/im, '').trim();

        // 4. Execute read-only report query
        const [rows] = await pool.query(cleanQuery);

        // 5. Return consistent JSON response
        return res.json({
            report: reportName,
            data: rows
        });

    } catch (error) {
        console.error(`[Report Error] Failed to generate report ${req.params.reportName}:`, error);
        return res.status(500).json({ error: 'Failed to generate report' });
    }
};

/**
 * GET /admin/reports
 * Lists all available whitelisted report names.
 */
exports.listReports = (req, res) => {
    return res.json({
        availableReports: Object.keys(REPORT_FILES)
    });
};
