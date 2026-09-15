# MediBook Backend (MongoDB Version)

Doctor Appointment Slot Booking System with concurrency control.

## Project Structure
- `src/config/db.js`: MongoDB Connection
- `src/models`: Mongoose Models (Doctor, Slot, Booking)
- `src/controllers`: API Logic
- `src/services`: Business Logic (Transactions)
- `src/routes`: API Routes
- `src/cron`: Background Jobs (Booking Expiry)

## Prerequisites
- Node.js
- MongoDB (Must be running as a **Replica Set** for transactions to work)

## Setup
1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/medibook?replicaSet=rs0
   ```
4. Start Server:
   ```bash
   npm start
   ```

## API Endpoints

### Admin
- **POST** `/admin/doctors`: Create Doctor
  - Body: `{ "name": "Dr. House", "specialization": "Diagnostic" }`
- **GET** `/admin/doctors`: List Doctors
- **POST** `/admin/slots`: Create Slot
  - Body: `{ "doctorId": "ID", "date": "2023-10-27", "time": "10:00" }`
- **GET** `/admin/slots`: List Slots (Query: `?doctorId=ID`)

### Patient
- **GET** `/doctors`: List Doctors
- **GET** `/doctors/:id/slots`: List Slots for Doctor
- **POST** `/bookings`: Book a Slot
  - Body: `{ "slotId": "ID", "patientName": "John Doe" }`
  - **Concurrency Note**: This endpoint uses MongoDB transactions to ensure a slot is not double-booked.
- **GET** `/bookings/:id`: Get Booking Details

## Concurrency & Expiry
- **Concurrency**: `bookingService.js` uses `mongoose.startSession()` and `startTransaction()` to lock the slot reading and updating process.
- **Expiry**: `expiryService.js` runs every minute. It finds `PENDING` bookings created > 2 mins ago (if any logic set them to PENDING, though currently bookings go straight to `CONFIRMED` per requirement logic, the service is there if needed or for failed payments integration).

## Testing Transactions
Ensure your MongoDB is a replica set.
```bash
# Start MongoDB as single node replica set (Windows)
mongod --port 27017 --dbpath C:\data\db --replSet rs0 --bind_ip 127.0.0.1
# In mongo shell:
rs.initiate()
```
