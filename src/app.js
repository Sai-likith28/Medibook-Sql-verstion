const express = require('express');
const cors = require('cors');
const pool = require('./config/mysql');
require('./cron/expiryService'); // Start Cron Job
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Verify MySQL pool connection on startup
pool.query('SELECT 1')
    .then(() => console.log('MySQL Connected'))
    .catch(err => console.error('MySQL connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

const adminRoutes = require('./routes/adminRoutes');
const patientRoutes = require('./routes/patientRoutes');

app.use('/admin', adminRoutes);
app.use('/', patientRoutes);

app.get('/', (req, res) => {
    res.send('MediBook API is running (MySQL)');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
