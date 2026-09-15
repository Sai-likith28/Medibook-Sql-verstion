# MediBook — MySQL Version

MediBook is a doctor appointment slot booking application. This repository represents the **relational SQL/DBMS-focused version** of MediBook, migrated from an initial MongoDB/Mongoose architecture to a normalized, high-concurrency **MySQL** relational database backend.

---

## 🏗️ Project Architecture

```
Frontend (React 18 + TypeScript + Vite)
        ↓  (Axios REST API Requests)
Express.js Backend (Node.js REST API)
        ↓  (Services & Controllers)
MySQL Connection Pool (mysql2/promise)
        ↓  (Parameterized SQL Queries & Transactions)
MySQL Relational Database (medibook_sql)
```

### Technology Stack
- **Backend**: Node.js, Express.js, `mysql2` (with promise-based connection pooling), `node-cron`, `dotenv`
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios
- **Database**: MySQL 8.0+ / 9.0+ (`InnoDB` engine, `utf8mb4` encoding)

---

## 📊 Relational Database Schema

The database consists of 4 normalized relational tables in 3NF:

```mermaid
erDiagram
    DOCTOR ||--o{ APPOINTMENT_SLOT : "creates & owns"
    PATIENT ||--o{ BOOKING : "places"
    APPOINTMENT_SLOT ||--o{ BOOKING : "booked via"

    DOCTOR {
        bigint id PK
        varchar name
        varchar specialization
        timestamp created_at
    }

    PATIENT {
        bigint id PK
        varchar name
        timestamp created_at
    }

    APPOINTMENT_SLOT {
        bigint id PK
        bigint doctor_id FK
        date slot_date
        time slot_time
        boolean is_booked
        timestamp created_at
    }

    BOOKING {
        bigint id PK
        bigint slot_id FK
        bigint patient_id FK
        enum status
        timestamp expires_at
        timestamp created_at
        bigint active_slot_id VIRTUAL
    }
```

### Table Details

1. **`doctors`**: Stores doctor profile information.
   - `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
   - `name`: `VARCHAR(255) NOT NULL`
   - `specialization`: `VARCHAR(255) NOT NULL` (Indexed via `idx_doctors_specialization`)
   - `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

2. **`patients`**: Dedicated patient entity master table (introduced to normalize patient data into 3NF rather than storing raw strings in bookings).
   - `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
   - `name`: `VARCHAR(255) NOT NULL` (Indexed via `idx_patients_name`)
   - `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

3. **`appointment_slots`**: Doctor availability slots.
   - `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
   - `doctor_id`: `BIGINT UNSIGNED NOT NULL` (Foreign Key referencing `doctors(id)` `ON DELETE CASCADE`)
   - `slot_date`: `DATE NOT NULL`
   - `slot_time`: `TIME NOT NULL` (Stores time in 24-hour format `HH:MM:SS`)
   - `is_booked`: `TINYINT(1) NOT NULL DEFAULT 0`
   - `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
   - **Constraints**: `UNIQUE KEY uk_doctor_date_time (doctor_id, slot_date, slot_time)` preventing duplicate slots per doctor at the same time.

4. **`bookings`**: Appointment booking transactions.
   - `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
   - `slot_id`: `BIGINT UNSIGNED NOT NULL` (Foreign Key referencing `appointment_slots(id)` `ON DELETE RESTRICT`)
   - `patient_id`: `BIGINT UNSIGNED NOT NULL` (Foreign Key referencing `patients(id)` `ON DELETE RESTRICT`)
   - `status`: `ENUM('PENDING', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'PENDING'`
   - `expires_at`: `TIMESTAMP NULL DEFAULT NULL`
   - `created_at`: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
   - `active_slot_id`: `BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING', 'CONFIRMED') THEN slot_id ELSE NULL END) VIRTUAL`
   - **Double Booking Protection**: `UNIQUE KEY uk_active_slot_booking (active_slot_id)`. Ensures at most ONE active (`PENDING` or `CONFIRMED`) booking can exist for a slot at any given time.

---

## 🔒 Implemented Database & Concurrency Features

- **Normalized 3NF Relational Model**: Standardized primary and foreign key constraints.
- **Connection Pooling**: Managed via `mysql2/promise` with configurable pool limits (`src/config/mysql.js`).
- **ACID Transactions**: Full multi-statement transaction management with commit and rollback error safety.
- **Row-Level Locking**: Pessimistic concurrency control using `SELECT ... FOR UPDATE` during slot booking.
- **Database-Level Double-Booking Prevention**: Enforced via a virtual generated column `active_slot_id` with a `UNIQUE` index.
- **Parameterized SQL Queries**: All database queries use binding placeholders (`?`) to prevent SQL injection.
- **Automatic Booking Expiry Cron Job**: Background worker running every minute (`node-cron`) to expire `PENDING` bookings older than 2 minutes and release slots back to available status.

---

## 🔄 Booking Transaction Flow

When a patient books a slot, the backend executes the following atomic flow:

1. **BEGIN**: Open a MySQL database transaction connection.
2. **Lock Slot**: Execute `SELECT id, is_booked FROM appointment_slots WHERE id = ? FOR UPDATE`.
3. **Check Availability**: Verify slot exists and `is_booked = 0`. If unavailable, rollback and return `409 Conflict`.
4. **Mark Slot Booked**: Update slot status: `UPDATE appointment_slots SET is_booked = 1 WHERE id = ?`.
5. **Resolve Patient**: Find or create the patient record in the `patients` table.
6. **Create Booking**: Insert record into `bookings` table with status `'CONFIRMED'`.
7. **COMMIT**: Commit transaction and release connection.

If concurrent requests attempt to book the same slot simultaneously, row-level locking ensures serial execution, while the `uk_active_slot_booking` UNIQUE constraint provides secondary engine-level enforcement.

---

## 🧪 Verification & Testing Results

The following integration and concurrency tests were executed against the active MySQL backend:

1. **Doctor Creation**: Verified `POST /admin/doctors` creates a doctor record.
2. **Doctor Retrieval**: Verified `GET /doctors` returns formatted doctor lists.
3. **Slot Creation**: Verified `POST /admin/slots` parses date/time formats into `DATE` and `TIME` columns.
4. **Duplicate Slot Rejection**: Verified `uk_doctor_date_time` rejects duplicate doctor/date/time slots (`400 Bad Request`).
5. **Slot Retrieval**: Verified `GET /doctors/:id/slots` retrieves available doctor slots.
6. **Patient Find-or-Create**: Verified automatic creation and reuse of `patients` master rows during booking.
7. **Booking Details (JOIN)**: Verified `GET /bookings/:id` executes multi-table SQL `JOIN`s to return populated slot and patient details.
8. **Double Booking Prevention**: Verified subsequent booking attempts on a booked slot return `409 Conflict`.
9. **Concurrency Test**: Fired 2 simultaneous booking requests at the exact same millisecond against a single slot. Exactly 1 request succeeded (`201 Created`) and 1 was rejected (`409 Conflict`), maintaining DB consistency.
10. **Expiry Cron Job**: Verified 2-minute-old `PENDING` bookings transition to `FAILED` and release `appointment_slots.is_booked` to `0`.
11. **Patient Reuse**: Verified duplicate bookings for the same patient name reuse the existing `patient_id`.
12. **Database Clean Reset**: Verified test environment setup and teardown.

---

## 🚀 Local Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+ or v9.0+)

### 2. Database Setup
Start your local MySQL server and create the database:
```sql
CREATE DATABASE medibook_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run the schema DDL script:
```bash
# Using MySQL Command Line Client:
mysql -u root -p medibook_sql < database/schema.sql
```

### 3. Environment Configuration
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```

Update `.env` with your local database credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=medibook_sql
CONNECTION_LIMIT=10
```

### 4. Install Dependencies & Start Backend
```bash
# Install backend dependencies
npm install

# Start backend development server
npm run dev
```

### 5. Start Frontend Client
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to interact with the application.
