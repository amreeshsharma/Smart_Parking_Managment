# ParkSmart - Smart Parking Management System (REST API Backend)

A complete Node.js + Express + MySQL 8 REST backend built for **ParkSmart** (Database Management System Project-Based Learning).

This backend interfaces directly with MySQL 8 using handwritten parameterized SQL queries, connection pooling, database triggers, stored procedures, and analytical views—without using any ORM.

---

## 1. System Architecture & Tech Stack

- **Runtime**: Node.js (v20+)
- **Web Framework**: Express 4 (CommonJS)
- **Database Driver**: `mysql2/promise` (connection pooling with `dateStrings: true`, `decimalNumbers: true`, `multipleStatements: false`)
- **Authentication**: `jsonwebtoken` (JWT bearer tokens) & `bcryptjs` (cost factor 10)
- **Security & Hardening**: `helmet` (security headers), `cors` (origin whitelisting), `express-rate-limit` (10 requests per 15 minutes on auth endpoints), 100kb payload caps
- **Validation**: `express-validator` with centralized error handling
- **Testing**: Built-in Node 20 `fetch` test runner (`test/smoke-test.js`)

---

## 2. Prerequisites

1. **Node.js**: v20.0.0 or higher (`node -v`)
2. **npm**: v10.0.0 or higher (`npm -v`)
3. **MySQL Server**: MySQL 8.0.16+ running on port `3306` (with CHECK constraints and window functions enabled)

---

## 3. Database Setup & Seeding

The database scripts are located in `../database/` relative to `/backend`:
- `../database/schema.sql`: DDL defining tables, constraints, triggers, procedures, views.
- `../database/sample_data.sql`: Seed data containing demo users, vehicles, facilities, reservations, sessions, and payments.

### Creating the Database User and Loading Schema

Log in to MySQL as `root`:

```bash
mysql -u root -p
```

Create the dedicated user and grant permissions:

```sql
CREATE USER IF NOT EXISTS 'parksmart_user'@'localhost' IDENTIFIED BY 'StrongPass@123';
GRANT ALL PRIVILEGES ON parksmart.* TO 'parksmart_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Load the schema and sample data:

```bash
mysql -u parksmart_user -pStrongPass@123 < ../database/schema.sql
mysql -u parksmart_user -pStrongPass@123 parksmart < ../database/sample_data.sql
```

> **Important Note Regarding Testing & Data Resets**:
> Running the test suite (`npm test`) adds test vehicles, makes reservations, settles payments, and marks session exits. To reset the database back to clean demo state at any time, simply re-run:
> ```bash
> mysql -u parksmart_user -pStrongPass@123 < ../database/schema.sql
> mysql -u parksmart_user -pStrongPass@123 parksmart < ../database/sample_data.sql
> ```

---

## 4. Environment Configuration (`.env`)

Create a `.env` file inside `/backend` (copied from `.env.example`):

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=parksmart_user
DB_PASSWORD=StrongPass@123
DB_NAME=parksmart
JWT_SECRET=9d85eff4bad002278a46d665a8df584f1d11f3f3cfe229cb5506fb7d1ea4f08d
JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500
```

---

## 5. Installation & Running

Navigate to the `backend/` directory:

```bash
cd backend
npm install
```

### Development Mode (with Nodemon hot-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will listen at `http://localhost:5000/api`.

---

## 6. Running Smoke & Integration Tests

Run the comprehensive integration test suite (21 automated test cases):

```bash
npm test
```

This verifies authentication, role security, vehicle fleet constraints, lot/bay spatial queries, stored procedures (`sp_create_reservation`, `sp_make_payment`, `sp_mark_exit`), triggers, penalty calculations, and reservation cancellation.

---

## 7. Demo Credentials

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **Driver / User** | `user@parksmart.com` | `123456` | Manage own fleet, book bays, view live session, pay fees |
| **Administrator** | `admin@parksmart.com` | `123456` | Full system access, telemetry KPIs, barrier operations, CRUD |

---

## 8. Standard JSON Response Format

Every endpoint in the system returns a uniform JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Human readable confirmation or guidance"
}
```

On error (`success: false`):
```json
{
  "success": false,
  "data": null,
  "message": "Descriptive error message"
}
```

HTTP Status Codes used:
- `200 OK`: Successful retrieval or modification
- `201 Created`: Resource successfully registered
- `400 Bad Request`: Validation failure or database trigger violation (SQLSTATE `45000`)
- `401 Unauthorized`: Missing, invalid, or expired JWT token, or bad credentials
- `403 Forbidden`: Role permission violation or ownership mismatch
- `404 Not Found`: Target entity does not exist
- `409 Conflict`: Unique constraint duplicate entry (`ER_DUP_ENTRY`) or active reservation conflict
- `500 Internal Server Error`: Server exception (internal database details obscured)

---

## 9. API Endpoint Reference Table

All routes are prefixed with `/api`.

| Method | Path | Role | Purpose / Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Public | Register new Driver account with 10-digit phone and bcrypt password |
| **POST** | `/api/auth/login` | Public | Authenticate as Driver (`User`) or Administrator (`Admin`) and receive JWT |
| **GET** | `/api/profile` | User / Admin | Retrieve current authenticated user profile |
| **PUT** | `/api/profile` | User / Admin | Update own profile contact details (`Name`, `Phone`) |
| **PUT** | `/api/profile/password` | User / Admin | Update own account password (verifies `currentPassword`) |
| **PUT** | `/api/users/:userId` | User / Admin | Update profile by ID (frontend API compatibility) |
| **PATCH** | `/api/users/:userId/password`| User / Admin | Update password by ID (frontend API compatibility) |
| **GET** | `/api/lots` | Public | List parking facilities with capacity and occupancy ratios (`v_lot_availability`) |
| **GET** | `/api/lots/:id` | Public | Get single facility details |
| **GET** | `/api/lots/:id/bays` | Public | Get parking bays for lot with optional `?floor=` level filter |
| **GET** | `/api/vehicles` | User / Admin | Driver sees own registered vehicles; Admin sees all vehicles with owner names |
| **POST** | `/api/vehicles` | User / Admin | Register new vehicle with unique license plate and RFID tag |
| **PUT** | `/api/vehicles/:id` | Owner / Admin | Update vehicle details |
| **DELETE** | `/api/vehicles/:id` | Owner / Admin | Delete vehicle (blocked if active or upcoming bookings exist) |
| **GET** | `/api/reservations` | User / Admin | List bookings via `v_reservation_details` (`?status=`, `?userId=`, `?search=`) |
| **POST** | `/api/reservations` | User / Admin | Create reservation & fee payment via procedure `sp_create_reservation` |
| **PATCH** | `/api/reservations/:id/cancel`| Owner / Admin| Cancel Upcoming reservation; trigger `trg_res_after_update` frees bay |
| **GET** | `/api/sessions` | User / Admin | Session history via `v_session_history` (`?active=true`, `?from=`, `?to=`) |
| **GET** | `/api/sessions/active` | User / Admin | Get live active dwelling session for user |
| **POST** | `/api/sessions/entry` | Admin only | Record gate entry by scanning RFID tag via `sp_record_entry_by_rfid` |
| **PATCH** | `/api/sessions/:id/exit` | Owner / Admin | Clear exit barrier, compute overstay & penalties via `sp_mark_exit` |
| **GET** | `/api/payments` | User / Admin | Financial ledger with status/type filters (`?status=`, `?type=`, `?search=`) |
| **POST** | `/api/payments/:id/pay` | Owner / Admin | Settle pending fee/penalty via procedure `sp_make_payment` |
| **GET** | `/api/admin/stats` | Admin only | Dashboard telemetry KPIs, bay breakdowns, 14-day revenue & overstays |
| **GET** | `/api/admin/lots` | Admin only | Master municipal facility ledger |
| **POST** | `/api/admin/lots` | Admin only | Create new facility and auto-provision bay layout |
| **PUT** | `/api/admin/lots/:id` | Admin only | Modify facility operating hours or capacity |
| **DELETE** | `/api/admin/lots/:id` | Admin only | Remove facility (blocked if active reservations exist) |
| **GET** | `/api/admin/bays` | Admin only | Master parking bay ledger with `?lot=` and `?floor=` filters |
| **POST** | `/api/admin/bays` | Admin only | Provision a new parking bay |
| **PUT** | `/api/admin/bays/:id` | Admin only | Modify bay type, status, or floor |
| **DELETE** | `/api/admin/bays/:id` | Admin only | Delete parking bay (blocked if active reservations exist) |
| **GET** | `/api/admin/users` | Admin only | List all accounts with vehicle and reservation count metrics |
| **POST** | `/api/admin/users` | Admin only | Create driver or administrator account |
| **PUT** | `/api/admin/users/:id` | Admin only | Modify user details |
| **DELETE** | `/api/admin/users/:id` | Admin only | Delete account (seeded primary accounts protected) |
| **GET** | `/api/admin/vehicles` | Admin only | Export-friendly fleet registry with owner names |
| **GET** | `/api/admin/reservations` | Admin only | Export-friendly reservation ledger with vehicle & payment data |
| **GET** | `/api/admin/sessions` | Admin only | Export-friendly parking session ledger |
| **GET** | `/api/admin/payments` | Admin only | Export-friendly financial transactions ledger |

---

## 10. Switching Frontend Between Real Backend & Mock Mode

Open `frontend/js/config.js`:

### To connect to this Live Express Backend:
```javascript
export const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
  USE_MOCK: false,
  APP_NAME: 'ParkSmart',
  STORAGE_PREFIX: 'parksmart_'
};
```

### To switch back to in-memory Mock Data:
```javascript
export const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api',
  USE_MOCK: true,
  APP_NAME: 'ParkSmart',
  STORAGE_PREFIX: 'parksmart_'
};
```
No frontend page rebuild or restart is required; simply refresh the browser.
