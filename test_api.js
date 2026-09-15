const http = require('http');

// Helper to make HTTP requests
const request = (path, method, data) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
};

const runTest = async () => {
    try {
        console.log('--- Starting MediBook API Test ---\n');

        // 1. Create Doctor
        console.log('1. Creating Doctor...');
        const doctorRes = await request('/admin/doctors', 'POST', {
            name: 'Dr. Gregory House',
            specialization: 'Diagnostics'
        });
        console.log(`Status: ${doctorRes.status}`, doctorRes.body);
        const doctorId = doctorRes.body._id;

        if (!doctorId) throw new Error('Failed to create doctor');

        // 2. Create Slot
        console.log('\n2. Creating Slot...');
        const slotRes = await request('/admin/slots', 'POST', {
            doctorId: doctorId,
            date: '2025-12-11',
            time: '14:00'
        });
        console.log(`Status: ${slotRes.status}`, slotRes.body);
        const slotId = slotRes.body._id;

        if (!slotId) throw new Error('Failed to create slot');

        // 3. Book Slot (Patient A)
        console.log('\n3. Booking Slot (Patient A)...');
        const bookingARes = await request('/bookings', 'POST', {
            slotId: slotId,
            patientName: 'Patient A'
        });
        console.log(`Status: ${bookingARes.status}`, bookingARes.body);

        // 4. Attempt Double Booking (Patient B) - Should Fail
        console.log('\n4. Attempting Double Booking (Patient B) [Expect Failure]...');
        const bookingBRes = await request('/bookings', 'POST', {
            slotId: slotId,
            patientName: 'Patient B'
        });
        console.log(`Status: ${bookingBRes.status}`, bookingBRes.body);

        if (bookingBRes.status === 409 || bookingBRes.body.error === 'Slot not available') {
            console.log('\n✅ SUCCESS: Double booking prevented!');
        } else {
            console.log('\n❌ FAILURE: Double booking was allowed or unexpected error.');
        }

    } catch (error) {
        console.error('\nTest Failed:', error);
    }
};

runTest();
