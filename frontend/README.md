# ParkSmart — Smart Parking Management System (Frontend)

Welcome to the frontend of **ParkSmart**, a modern, responsive Smart Parking Management System engineered for a DBMS College Project (PBL). It is built with clean vanilla web technologies and an enterprise data-access architecture designed to connect seamlessly to a Node.js/Express + MySQL backend.

---

## 🚀 Quick Start (Running Locally)

The frontend requires **no bundlers, no build steps, and zero npm dependencies**. It can be served directly as static files.

### Option 1: Using `npx serve` (Recommended)
From the project root:
```bash
npx serve Smart_Parking_Management/frontend
```
Or navigate into the `frontend` directory:
```bash
cd Smart_Parking_Management/frontend
npx serve .
```

### Option 2: Using Python 3 Built-in HTTP Server
From the `frontend` directory:
```bash
cd Smart_Parking_Management/frontend
python3 -m http.server 3000
```
Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Demo Credentials

The application is pre-seeded with realistic relational Indian parking data (Bangalore / Mumbai facilities, Indian registration plates, RFID tags, reservations, sessions, and payments).

| Role | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- |
| **Driver / User** | `user@parksmart.com` | `123456` | Book bays, live session timer, gate pass QR, vehicles CRUD, payments, history |
| **Administrator** | `admin@parksmart.com` | `123456` | Facility CRUD, Bay management, live session overstay audit & mark exit, CSV export, analytics charts |

> 💡 **Tip:** On the [Login Page](file:///home/ashrit/Desktop/CLG/DBMS/PBL/smartparking/Smart_Parking_Management/frontend/login.html), click the quick-fill chips (**Driver Demo** or **Admin Demo**) to automatically populate credentials and switch roles instantly.

---

## 🔄 Switching From Mock Mode to Real API

The frontend utilizes a clean Data-Access Layer in [`js/api.js`](file:///home/ashrit/Desktop/CLG/DBMS/PBL/smartparking/Smart_Parking_Management/frontend/js/api.js) that abstracts all page controllers from data retrieval.

To switch from the client-side mock database to a live Node.js/Express + MySQL backend:

1. Open [`frontend/js/config.js`](file:///home/ashrit/Desktop/CLG/DBMS/PBL/smartparking/Smart_Parking_Management/frontend/js/config.js)
2. Change `USE_MOCK` to `false`:
   ```javascript
   export const CONFIG = {
     // Toggle between local mock database and live REST API
     USE_MOCK: false,

     // Set your backend API server URL
     API_BASE_URL: 'http://localhost:5000/api',

     // Mock artificial latency in milliseconds (only applied when USE_MOCK: true)
     SIMULATED_DELAY_MS: 300,
   };
   ```
3. When `USE_MOCK = false`, all data access calls in `api.js` automatically route to `${CONFIG.API_BASE_URL}/...` with `Authorization: Bearer <token>` HTTP headers and standard JSON payloads.

---

## 🔌 Expected REST API Endpoints (Backend Contract)

The backend Node.js/Express service should implement the following REST endpoints to interface with the frontend:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate user and return `{ token, user }` |
| `POST` | `/auth/register` | Register new user account |
| `GET`, `POST` | `/vehicles` | Get all vehicles for user or add a new vehicle |
| `PUT`, `DELETE` | `/vehicles/:id` | Update vehicle or delete vehicle |
| `GET`, `POST` | `/lots` | Get all parking lots or create a new lot (Admin) |
| `PUT`, `DELETE` | `/lots/:id` | Update or delete parking lot (Admin) |
| `GET`, `POST` | `/bays` | List bays (supports `?lotId=&floor=`) or create bay (Admin) |
| `PUT`, `DELETE` | `/bays/:id` | Update or delete parking bay (Admin) |
| `GET`, `POST` | `/reservations` | Get user/all reservations or create a new reservation |
| `PATCH` | `/reservations/:id/cancel` | Cancel an upcoming reservation |
| `GET` | `/sessions` | Query parking sessions |
| `PATCH` | `/sessions/:id/exit` | Mark vehicle exit, compute overstay, and assess penalty |
| `GET`, `POST` | `/payments` | Retrieve payments or process payment for reservation/penalty |
| `GET` | `/admin/stats` | Aggregated metrics for admin dashboard (revenue, occupancy, active sessions) |
| `GET`, `POST` | `/admin/users` | Manage registered users |

---

## 🗂️ Project Structure & File Map

```text
Smart_Parking_Management/
├── frontend/
│   ├── index.html                  # Public SaaS landing page (hero, mockup, features, pricing, CTA)
│   ├── login.html                   # Split auth page with role toggle, demo chips & validation
│   ├── register.html                # Account registration with 10-digit phone & password confirmation
│   ├── user/                        # Driver / User Portal
│   │   ├── dashboard.html           # 4 stat cards, live session timer, gate QR modal, recent items
│   │   ├── find-parking.html        # Interactive 2-step lot & floor bay selector with live rates
│   │   ├── vehicles.html            # User vehicle card grid with RFID validation modal
│   │   ├── reservations.html        # Booking ledger with filter tabs, view details, cancel & pay
│   │   ├── history.html             # Past parking sessions with dwell duration & overstay penalties
│   │   ├── payments.html            # Payment transactions list with pay button for pending items
│   │   └── profile.html             # Edit account info, change password, reset mock DB
│   ├── admin/                       # Administrator Portal
│   │   ├── dashboard.html           # KPI cards, Chart.js occupancy bar & revenue line charts, overstays
│   │   ├── lots.html                # Parking lots CRUD with operating hours & bay count validation
│   │   ├── bays.html                # Master bay table with lot/floor/type filters & add/edit modal
│   │   ├── reservations.html        # Admin reservations audit with CSV export & cancellation
│   │   ├── sessions.html            # Active & past sessions with "Mark Exit" overstay settlement
│   │   ├── payments.html            # Financial ledger with status filters & CSV export
│   │   ├── users.html               # User accounts table with role filter & creation modal
│   │   └── vehicles.html            # System-wide registered vehicles with RFID tags
│   ├── css/
│   │   ├── base.css                 # CSS variables (#4F46E5 primary, slate typography, reset)
│   │   ├── components.css           # Buttons, forms, badges, stat cards, tables, tabs, modals, toasts
│   │   ├── layout.css               # Public navbar, user dashboard layout, dark slate admin sidebar
│   │   └── pages.css                # Landing hero, spatial bay grid, telemetry cards, charts
│   ├── js/
│   │   ├── config.js                # Environment config (USE_MOCK, API_BASE_URL)
│   │   ├── mock-data.js             # Relational Indian dataset preloaded in localStorage
│   │   ├── api.js                   # Unified data access layer with tariff & business logic
│   │   ├── auth.js                  # Session state, route guards (User vs Admin), logout
│   │   ├── ui.js                    # Shared sidebar/topbar injection, toast alerts, accessible modals
│   │   └── pages/                   # 18 page controllers (ES modules)
│   ├── assets/
│   │   ├── logo.svg                 # ParkSmart brand logo
│   │   └── favicon.svg              # Brand favicon
│   └── README.md                    # This documentation file
├── backend/                         # Node.js/Express backend placeholder (.gitkeep)
└── database/                        # MySQL relational schema, queries and sample data (.gitkeep)
```

---

## 💼 Business Rules Implemented Client-Side

In mock mode (`USE_MOCK = true`), `js/api.js` enforces the exact business rules specified by the DBMS project requirements:

1. **Reservation Validation**:
   - `End_Time` must be after `Start_Time`.
   - `Booking_Date` cannot be in the past.
   - Selected bay must be `'Available'`.
   - Rejects overlapping reservations for the same bay on the same date/time window.
2. **Hourly Tariff Rates**:
   - Regular Bay: **₹40 / hour**
   - EV Charging Bay: **₹60 / hour**
   - Disabled / Accessible Bay: **₹20 / hour**
   - Compact Bay: **₹30 / hour**
3. **Session Exit & Overstay Penalties**:
   - `Duration` is dynamically calculated between `Exit_Time` and `Entry_Time`.
   - `Overstay_Minutes = Math.max(0, Exit_Time - Reservation_End_Time)`.
   - `Penalty_Amount = Overstay_Minutes × ₹2.00`.
   - When overstay occurs, a pending penalty payment is automatically created.
4. **Data Consistency**:
   - Cancelling a reservation automatically frees the associated bay back to `'Available'`.
   - Paying a reservation marks `Payment_Status = 'Paid'` and generates an authentic `TXN<timestamp><random>` transaction reference.
   - Edits and transactions persist across page reloads using browser `localStorage` (`parksmart_mock_db_v1`). You can reset the mock database anytime via **User Profile → Reset Mock Database**.

---

## 🎨 Design System & Accessibility

- **Color Palette**:
  - Primary: `#4F46E5` (Hover: `#4338CA`)
  - Admin Slate Dark: `#0F172A`
  - Text: Dark slate `#0F172A`, Muted `#475569`, Subtle `#94A3B8`
  - Status Indicators: Emerald Green (Available/Paid), Amber (Reserved/Pending), Rose Red (Occupied/Penalty), Slate Gray (Cancelled)
- **Typography**: Google Fonts Inter (`font-family: 'Inter', sans-serif`).
- **Icons**: Lucide Icons via CDN.
- **Charts**: Chart.js v4 via CDN on Admin Dashboard.
- **Responsiveness**: Mobile-first design adapting seamlessly from 360px phones to tablets (collapsible drawer navigation) and 4K desktop screens.
- **Accessibility**: Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`), visible `:focus-visible` outlines, ARIA roles (`role="dialog"`, `aria-modal="true"`, `aria-selected="true"`), and full keyboard navigation.
