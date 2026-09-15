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

## ⚙️ MySQL Stored Procedure (`book_appointment`)

The repository includes a standalone MySQL stored procedure located at [`database/procedures/book_appointment.sql`](database/procedures/book_appointment.sql).

### Parameters
- `IN p_patient_id BIGINT UNSIGNED`: Primary key of the target patient in `patients`.
- `IN p_slot_id BIGINT UNSIGNED`: Primary key of the target slot in `appointment_slots`.

### Validation & Execution Flow
1. **Patient Validation**: Verifies `p_patient_id` exists in `patients`. If missing, raises `'Patient not found'` via `SIGNAL SQLSTATE '45000'`.
2. **Slot Validation & Row Locking**: Locks the slot row using `SELECT ... FOR UPDATE`. If missing, raises `'Appointment slot not found'`.
3. **Availability Check**: Verifies `is_booked = 0`. If `is_booked = 1`, raises `'Appointment slot is already booked'`.
4. **Booking Insertion**: Inserts record into `bookings` table with status `'CONFIRMED'`.
5. **Slot State Update**: Updates `appointment_slots.is_booked = 1`.
6. **Transaction Safety**: Encapsulated within `START TRANSACTION ... COMMIT`. Utilizes `DECLARE EXIT HANDLER FOR SQLEXCEPTION` with `ROLLBACK; RESIGNAL;` to guarantee atomic state changes.

### Direct SQL Execution Example
```sql
USE medibook_sql;
CALL book_appointment(1, 1);
```

> [!NOTE]
> **Terminology Note**: This project demonstrates procedural database concepts using **MySQL Stored Procedures** written in MySQL's procedural SQL syntax (`DELIMITER`, `CREATE PROCEDURE`, `SIGNAL`, `EXIT HANDLER`). Note that **PL/SQL** (Procedural Language/Structured Query Language) is proprietary to **Oracle Database**. MySQL uses MySQL Procedural SQL. This project demonstrates stored procedure design, row locking, and transaction management using MySQL's native procedural dialect.


---

## 📜 MySQL Triggers — Booking Audit Log

The repository includes database triggers defined in [`database/triggers/booking_audit.sql`](database/triggers/booking_audit.sql) that automatically log an immutable history of booking creation and status transitions into the `booking_audit` table.

### Audit Table Schema (`booking_audit`)
```sql
CREATE TABLE IF NOT EXISTS booking_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50) NULL DEFAULT NULL,
    new_status VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'INSERT' or 'UPDATE'
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_audit_booking_id (booking_id),
    INDEX idx_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Implemented Triggers
1. **`trg_bookings_after_insert`** (`AFTER INSERT ON bookings`):
   - Automatically logs an initial audit entry when a booking is created (`action = 'INSERT'`, `old_status = NULL`, `new_status = NEW.status`).
2. **`trg_bookings_after_update`** (`AFTER UPDATE ON bookings`):
   - Logs status transitions (`action = 'UPDATE'`, `old_status = OLD.status`, `new_status = NEW.status`).
   - **Status Change Guard**: Executes **only** if the booking status actually changes (`OLD.status <> NEW.status`), preventing unnecessary audit log rows during no-op updates.

### Key Trigger Design & Safety Principles
- **Database-Level Audit Governance**: The triggers execute at the database engine level, guaranteeing audit history capturing regardless of whether the booking change originates from the Express REST API, Node.js services, the `book_appointment` stored procedure, the background expiry cron job, or direct SQL commands in MySQL Workbench.
- **Why Triggers Do NOT Mutate `is_booked`**: The triggers strictly insert into `booking_audit` and do **not** mutate `appointment_slots` or `bookings`. This prevents trigger recursion, lock contention, and transaction deadlocks with application-level `SELECT ... FOR UPDATE` locks.
- **Transactional Participation**: Triggers execute synchronously within the calling transaction. If a booking creation or status update rolls back, its corresponding `booking_audit` record is automatically rolled back.
- **Audit Scope Note**: This implementation provides database-level transaction audit logging. It serves as an internal table audit trail rather than a full enterprise Change Data Capture (CDC) or external event-streaming architecture.


---

## 📈 SQL Reporting & Analytics

The repository includes a dedicated SQL reporting layer under [`database/reports/`](database/reports/) featuring 6 production-grade analytical SQL reports.

### Key Semantics & Data Model Principles
- **Read-Only**: All report queries perform strict `SELECT` operations without modifying data or schema definitions.
- **Availability vs. History Decoupling**: `appointment_slots.is_booked` represents current row availability state (`0` = available, `1` = booked). `bookings.status` (`CONFIRMED`, `PENDING`, `FAILED`) represents the historical booking lifecycle. Multiple historical booking attempts (e.g. `FAILED` or expired attempts) can exist for a single slot over time.
- **Division-by-Zero Safety**: All percentage ratio calculations utilize `NULLIF(denominator, 0)` to guarantee safe handling of zero-row data sets.

### Implemented Reports Overview

| Report Script | Purpose | Key SQL Concepts |
| :--- | :--- | :--- |
| [`doctor_utilization.sql`](database/reports/doctor_utilization.sql) | Evaluates doctor schedule capacity, confirmed bookings, failed bookings, current available slots, and utilization percentage. | `LEFT JOIN`, `GROUP BY`, `COUNT(DISTINCT)`, `SUM`, `CASE`, `NULLIF`, `ROUND` |
| [`daily_summary.sql`](database/reports/daily_summary.sql) | Tracks daily appointment volume, confirmed bookings, failed attempts, and confirmation rates over a rolling `±30-day` date range. | Date range filtering (`CURDATE() ± 30 DAY`), `LEFT JOIN`, `GROUP BY`, `CASE`, `ROUND` |
| [`patient_activity.sql`](database/reports/patient_activity.sql) | Identifies patient booking history, total attempts, confirmed visits, failed attempts, and date of most recent booking. | `INNER JOIN`, `GROUP BY`, `COUNT`, `SUM(CASE)`, `MAX(date)`, `HAVING` |
| [`peak_booking_time.sql`](database/reports/peak_booking_time.sql) | Categorizes slot demand by hour of the day and time windows (Morning, Afternoon, Evening) to analyze patient booking preferences. | `HOUR()`, `TIME_FORMAT()`, `CASE` interval classification, `GROUP BY`, `SUM` |
| [`specialization_demand.sql`](database/reports/specialization_demand.sql) | Aggregates capacity, confirmed bookings, failed attempts, and fill rates at the medical specialization / department level. | Multi-table `LEFT JOIN`, `GROUP BY`, `COUNT(DISTINCT)`, `ROUND` |
| [`booking_audit_lifecycle.sql`](database/reports/booking_audit_lifecycle.sql) | Analyzes system lifecycle status change events (`INSERT`, `PENDING -> FAILED`, `PENDING -> CONFIRMED`) using the `booking_audit` table. | Subquery ratio calculation, `COALESCE`, `GROUP BY`, `COUNT` |

### Executing Reports
Reports can be run via MySQL Command Line Client or any standard MySQL Workbench / GUI:
```bash
mysql -u root -p medibook_sql < database/reports/doctor_utilization.sql
```
Alternatively, execute `node test_reports.js` to run the automated test suite against the local database.

---

## 📈 Read-Only SQL Reporting API (Step 9A)

The backend provides a read-only Express API for accessing the 6 analytical SQL reports.

### Endpoint Specification

- **Base URL**: `GET /admin/reports/:reportName`
- **List All Reports**: `GET /admin/reports`

### Whitelisted Report Names

| Report Name | Corresponding SQL Script | Description |
| :--- | :--- | :--- |
| `doctor-utilization` | `doctor_utilization.sql` | Calculates slot utilization rates (%) per doctor. |
| `daily-summary` | `daily_summary.sql` | Summarizes daily booking volume and status ratios. |
| `patient-activity` | `patient_activity.sql` | Aggregates booking history and last booking date per patient. |
| `peak-booking-time` | `peak_booking_time.sql` | Analyzes slot demand distribution by hour and time window. |
| `specialization-demand` | `specialization_demand.sql` | Aggregates department capacity, bookings, and fill rates. |
| `booking-audit-lifecycle` | `booking_audit_lifecycle.sql` | Aggregated metrics of system status change audit events. |

### Read-Only & Security Design
- **Strict Whitelist**: Unrecognized report names are rejected immediately with `HTTP 400 Bad Request` (`{ "error": "Invalid report name" }`), preventing SQL injection and path traversal.
- **Read-Only Execution**: Executes `SELECT` statements only via the connection pool. No data modifications (`INSERT`, `UPDATE`, `DELETE`) are performed.
- **Safe Error Handling**: Server errors return `HTTP 500` with generic error messages (`{ "error": "Failed to generate report" }`) without exposing raw SQL or connection details.

### Example Request & Response

#### Request
```bash
GET http://localhost:3000/admin/reports/doctor-utilization
```

#### Successful Response (`200 OK`)
```json
{
  "report": "doctor-utilization",
  "data": [
    {
      "doctor_id": 1,
      "doctor_name": "Dr. Sarah Connor",
      "specialization": "Neurology",
      "total_slots": 5,
      "booked_slots": 4,
      "confirmed_bookings": 4,
      "failed_bookings": 0,
      "available_slots": 1,
      "utilization_rate_pct": "80.00"
    }
  ]
}
```

#### Invalid Request Response (`400 Bad Request`)
```json
{
  "error": "Invalid report name"
}
```

---

## 🧪 Testing, Error Handling & Debugging Quality

The repository features a complete 6-part automated test suite covering API validation, status code mapping, concurrency, stored procedures, triggers, rollbacks, read-only analytical reports, and reporting API endpoints.

### Test Suites Overview & Commands

| Test Suite File | Command | Scope & Verification |
| :--- | :--- | :--- |
| **`test_migration.js`** | `node test_migration.js` | REST API endpoints, JSON formatting (`_id: String`), duplicate slot rejection, and API-level concurrency testing (2 simultaneous HTTP requests). |
| **`test_procedure.js`** | `node test_procedure.js` | Direct SQL execution of stored procedure `book_appointment`, validation error rejections (`Patient not found`, `Slot not found`), and procedure-level concurrency testing. |
| **`test_trigger.js`** | `node test_trigger.js` | Verification of `trg_bookings_after_insert` and `trg_bookings_after_update` triggers, no-op status update filtering, and trigger transaction rollback safety. |
| **`test_reports.js`** | `node test_reports.js` | Verification of all 6 read-only SQL reports, output table column mapping, and empty-dataset division-by-zero safety (`NULLIF`). |
| **`test_error_handling.js`** | `node test_error_handling.js` | API status code verification (`400`, `404`, `409`), whitespace validation, and non-orphan data checks on transaction failure. |
| **`test_report_api.js`** | `node test_report_api.js` | Verification of all 6 reporting API endpoints (`HTTP 200`), whitelist validation (`HTTP 400`), and read-only database safety checks (row count integrity before/after). |

#### Running All Test Suites
```bash
node test_migration.js; node test_procedure.js; node test_trigger.js; node test_reports.js; node test_error_handling.js; node test_report_api.js
```

### Key Quality & Error Handling Design Principles
1. **HTTP Status Code Standardization**:
   - `400 Bad Request`: Returned on missing/empty required fields, whitespace inputs, or duplicate slot creation attempts (`uk_doctor_date_time`).
   - `404 Not Found`: Returned when attempting to view/query a non-existent doctor ID or booking ID.
   - `409 Conflict`: Returned when attempting to book an unavailable, non-existent, or already-booked slot.
2. **Transaction & Rollback Integrity**:
   - Every booking attempt is executed inside an atomic transaction. If any validation, foreign key check, or active slot constraint fails, the transaction issues `ROLLBACK`, guaranteeing zero orphan records in `patients`, `bookings`, `appointment_slots`, or `booking_audit`.
3. **Data Protection & Secret Masking**:
   - Database errors are caught cleanly in controller try-catch blocks and returned as structured JSON error messages without exposing raw database credentials, connection strings, or internal SQL traces.

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
