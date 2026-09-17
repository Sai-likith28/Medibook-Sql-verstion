const express = require('express');
const cors = require('cors');
const pool = require('./config/mysql');
require('./cron/expiryService'); // Start Cron Job
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const { ensurePhase10bSchema } = require('./config/migratePhase10b');

// Verify MySQL pool connection & run Phase 10B schema extensions on startup
pool.query('SELECT 1')
    .then(async () => {
        console.log('MySQL Connected');
        try {
            await ensurePhase10bSchema(pool);
            console.log('Phase 10B Schema & Seed Sync Completed');
        } catch (err) {
            console.error('Phase 10B Schema Sync Error:', err.message);
        }
    })
    .catch(err => console.error('MySQL connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');

app.use('/auth', authRoutes);
app.use('/admin/reports', reportRoutes);
app.use('/admin', adminRoutes);
app.use('/doctor', doctorRoutes);
app.use('/', patientRoutes);

app.get('/', (req, res) => {
    res.send('MediBook API is running (MySQL)');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
