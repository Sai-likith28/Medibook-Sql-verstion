const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/mysql');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * POST /auth/login
 * Public Login endpoint for Patients, Doctors, and Admin
 */
exports.login = async (req, res) => {
    try {
        const { loginId, password } = req.body;

        if (!loginId || !password || !loginId.trim() || !password.trim()) {
            return res.status(400).json({ error: 'Login ID and password are required' });
        }

        const trimmedLogin = loginId.trim();

        // 1. Fetch user by login_id
        const [users] = await pool.query(
            'SELECT id, login_id, password_hash, role, status FROM users WHERE login_id = ?',
            [trimmedLogin]
        );

        if (users.length === 0) {
            // Generic message prevents username enumeration
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        const user = users[0];

        // 2. Account Status Check
        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: `Account is ${user.status.toLowerCase()}. Please contact administration.` });
        }

        // 3. Verify Password Hash
        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        // 4. Retrieve associated role-specific metadata
        let patientId = null;
        let patientCode = null;
        let doctorId = null;
        let doctorCode = null;
        let profileName = user.login_id;

        if (user.role === 'PATIENT') {
            const [pats] = await pool.query('SELECT id, patient_code, name FROM patients WHERE user_id = ?', [user.id]);
            if (pats.length > 0) {
                patientId = pats[0].id;
                patientCode = pats[0].patient_code;
                profileName = pats[0].name;
            }
        } else if (user.role === 'DOCTOR') {
            const [docs] = await pool.query('SELECT id, doctor_code, name FROM doctors WHERE user_id = ?', [user.id]);
            if (docs.length > 0) {
                doctorId = docs[0].id;
                doctorCode = docs[0].doctor_code;
                profileName = docs[0].name;
            }
        }

        // 5. Generate Signed JWT Token (24h validity)
        const token = jwt.sign(
            {
                id: user.id,
                loginId: user.login_id,
                role: user.role,
                patientId,
                doctorId
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 6. Return response (NEVER return password_hash!)
        res.json({
            token,
            user: {
                id: user.id,
                loginId: user.login_id,
                role: user.role,
                status: user.status,
                name: profileName,
                patientId,
                patientCode,
                doctorId,
                doctorCode
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /auth/me
 * Returns current authenticated user state
 */
exports.getMe = async (req, res) => {
    try {
        res.json({ user: req.user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
