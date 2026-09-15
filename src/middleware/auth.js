const jwt = require('jsonwebtoken');
const pool = require('../config/mysql');

const JWT_SECRET = process.env.JWT_SECRET || 'medibook_jwt_secret_key_2026_super_secure';

/**
 * Express Middleware: Authenticate Bearer JWT Token
 * Verifies JWT signature, expiration, and real-time database active status.
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Fetch fresh user status from DB to ensure account is active & not suspended
        const [users] = await pool.query(
            'SELECT id, login_id, role, status FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'User account no longer exists.' });
        }

        const user = users[0];
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is inactive or suspended.' });
        }

        let patientId = null;
        let patientCode = null;
        let doctorId = null;
        let doctorCode = null;
        let name = null;

        if (user.role === 'PATIENT') {
            const [pats] = await pool.query('SELECT id, patient_code, name FROM patients WHERE user_id = ?', [user.id]);
            if (pats.length > 0) {
                patientId = pats[0].id;
                patientCode = pats[0].patient_code;
                name = pats[0].name;
            }
        } else if (user.role === 'DOCTOR') {
            const [docs] = await pool.query('SELECT id, doctor_code, name FROM doctors WHERE user_id = ?', [user.id]);
            if (docs.length > 0) {
                doctorId = docs[0].id;
                doctorCode = docs[0].doctor_code;
                name = docs[0].name;
            }
        }

        // Attach verified user identity to request
        req.user = {
            id: user.id,
            loginId: user.login_id,
            role: user.role,
            status: user.status,
            name: name || user.login_id,
            patientId,
            patientCode,
            doctorId,
            doctorCode
        };

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

/**
 * Middleware Factory: Enforce Required Roles
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Requires ${allowedRoles.join(' or ')} role.` });
        }

        next();
    };
};

/**
 * Architectural Security Rule:
 * The backend MUST NEVER trust client-supplied patient IDs in request bodies or URL parameters for authenticated patient operations.
 * All patient ownership checks must derive patient identity directly from req.user.patientId.
 */
const authorizePatientOwnership = (paramKey = 'patientId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (req.user.role === 'ADMIN') return next();

        const targetId = Number(req.params[paramKey] || req.body[paramKey]);
        if (!req.user.patientId || Number(req.user.patientId) !== targetId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access another patient record.' });
        }
        next();
    };
};

/**
 * Architectural Security Rule:
 * Doctors are restricted to accessing and modifying appointments assigned to their doctorId.
 */
const authorizeDoctorOwnership = (paramKey = 'doctorId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (req.user.role === 'ADMIN') return next();

        const targetId = Number(req.params[paramKey] || req.body[paramKey]);
        if (!req.user.doctorId || Number(req.user.doctorId) !== targetId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access another doctor record.' });
        }
        next();
    };
};

module.exports = {
    JWT_SECRET,
    authenticateToken,
    requireRole,
    authorizePatientOwnership,
    authorizeDoctorOwnership
};
