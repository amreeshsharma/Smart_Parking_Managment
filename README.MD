# ParkSmart --- Smart Parking Management System

> A full-stack smart parking platform for parking discovery, bay
> reservation, advance payment, parking-session tracking, overstay
> detection, penalty management, and administrative operations.

## Overview

**ParkSmart** is a full-stack Smart Parking Management System designed
to simplify parking discovery, reservation, payment, and parking
operations.

The platform allows users to discover parking lots, check bay
availability, reserve a specific bay, make mandatory advance payments,
receive confirmation, and manage their parking sessions. Administrators
can manage parking infrastructure, reservations, sessions, payments,
users, vehicles, and reports.

## Problem Statement

Traditional parking systems can make it difficult to:

-   Find available parking.
-   Know parking occupancy in advance.
-   Reserve a specific parking bay.
-   Manage parking payments centrally.
-   Track vehicle entry and exit.
-   Detect overstaying.
-   Calculate penalties.
-   Monitor parking operations.

ParkSmart addresses these problems through a centralized digital parking
platform.

## Solution

``` text
Find Parking
     ↓
Select Parking Lot
     ↓
View Available Bays
     ↓
Select Bay
     ↓
Select Vehicle
     ↓
Select Date & Time
     ↓
Review Reservation
     ↓
Mandatory Advance Payment
     ↓
Reservation Confirmed
     ↓
Parking Session
     ↓
Entry → Active Session → Exit
     ↓
Duration Calculation
     ↓
Overstay Check
     ↓
Penalty if Applicable
     ↓
Session / Payment History
```

## Core Features

### User

-   Registration and login
-   Vehicle management
-   Parking discovery
-   Map-based parking visualization
-   Interactive parking-bay selection
-   Parking reservations
-   Mandatory advance payment
-   Reservation confirmation
-   Active parking-session tracking
-   Entry and exit tracking
-   Duration calculation
-   Overstay detection
-   Penalty calculation
-   Reservation history
-   Session history
-   Payment history
-   Profile and settings
-   Notifications

### Admin

-   Admin dashboard
-   Parking-lot management
-   Parking-bay management
-   Floor-wise bay visualization
-   Reservation management
-   Live parking-session monitoring
-   Overstay monitoring
-   Payment management
-   User management
-   Vehicle management
-   Occupancy analytics
-   Revenue analytics
-   Reports

## User Roles

### Driver / User

Users can:

-   Manage their account.
-   Add and manage multiple vehicles.
-   Search for parking.
-   View parking-lot availability.
-   Select parking bays.
-   Create reservations.
-   Make payments.
-   Track parking sessions.
-   View reservations, sessions, and payment history.

### Admin

Admins can:

-   Manage parking lots.
-   Manage parking bays.
-   Manage reservations.
-   Monitor parking sessions.
-   Monitor overstays.
-   Manage users and vehicles.
-   Monitor payments.
-   View reports and analytics.

## System Workflow

1.  User registers.
2.  User logs in.
3.  User adds one or more vehicles.
4.  User searches for a parking lot.
5.  User views available bays.
6.  User selects a bay.
7.  User selects a vehicle.
8.  User selects booking date and time.
9.  User reviews the reservation.
10. User makes mandatory advance payment.
11. Reservation becomes confirmed after successful payment.
12. Parking session starts when the vehicle enters.
13. Entry time is recorded.
14. Exit time is recorded when the vehicle leaves.
15. Duration is calculated.
16. The system checks for overstay.
17. A penalty is calculated when applicable.
18. Session and payment records are retained for history.

## Database Design

The database is based on the Smart Parking Management System ER diagram.

### USER

``` text
USER
-------------------------
User_ID       PK
Name
Email
Phone
Password
Role
```

Relationship:

``` text
USER 1 -------- M VEHICLE
```

### VEHICLE

``` text
VEHICLE
-------------------------
Vehicle_ID       PK
Vehicle_Number
RFID_Tag
Brand
Color
User_ID          FK
```

### PARKING LOT

``` text
PARKING_LOT
-------------------------
Lot_ID           PK
Lot_Name
Location
Total_Bays
Open_Time
Close_Time
```

Relationship:

``` text
PARKING LOT 1 -------- M PARKING BAY
```

### PARKING BAY

``` text
PARKING_BAY
-------------------------
Bay_ID           PK
Bay_Number
Floor
Bay_Type
Status
Lot_ID           FK
```

### RESERVATION

``` text
RESERVATION
-------------------------
Reservation_ID   PK
Booking_Date
Start_Time
End_Time
Status
Vehicle_ID       FK
Bay_ID           FK
```

### PAYMENT

``` text
PAYMENT
-------------------------
Payment_ID       PK
Amount
Payment_Type
Payment_Mode
Transaction_ID
Payment_Status
Payment_Date
Reservation_ID   FK
```

Payment types:

``` text
Advance
Penalty
Refund
```

### PARKING SESSION

``` text
PARKING_SESSION
-------------------------
Session_ID
Entry_Time
Exit_Time
Duration          Derived
Overstay_Minutes  Derived
Penalty_Amount    Derived
Reservation_ID    FK
Vehicle_ID        FK
Bay_ID            FK
```

### ADMIN

``` text
ADMIN
-------------------------
Admin_ID          PK
Name
Email
Password
```

## Entity Relationships

``` text
USER
  │
  │ 1:M
  ▼
VEHICLE
  │
  │ 1:M
  ▼
RESERVATION
  │
  ├──────── 1:1 ────────► PAYMENT
  │
  └──────── 1:1 ────────► PARKING SESSION

PARKING LOT
  │
  │ 1:M
  ▼
PARKING BAY
```

## Business Rules

1.  A user can own multiple vehicles.
2.  Each vehicle belongs to one user.
3.  A parking lot contains multiple parking bays.
4.  Each parking bay belongs to one parking lot.
5.  A reservation is associated with a vehicle and parking bay.
6.  Advance payment is mandatory before reservation confirmation.
7.  A confirmed reservation can initiate a parking session.
8.  A parking session records entry and exit time.
9.  Duration is derived from entry and exit time.
10. Overstay minutes are calculated when actual exit exceeds the
    reserved end time.
11. Penalty amount is generated when applicable.
12. Payment records are associated with reservations.
13. Multiple parking lots are supported.
14. Admins manage parking infrastructure and operations.

## Reservation States

``` text
PENDING PAYMENT
CONFIRMED
ACTIVE
COMPLETED
CANCELLED
EXPIRED
```

## Payment States

``` text
PENDING
SUCCESSFUL
FAILED
REFUNDED
```

## Parking Bay States

``` text
AVAILABLE
RESERVED
OCCUPIED
MAINTENANCE
DISABLED
```

## Parking Session States

``` text
UPCOMING
ACTIVE
COMPLETED
OVERSTAY
```

## Architecture

``` text
                    CLIENT
                      │
                      ▼
             ┌─────────────────┐
             │  React Frontend │
             │ Vite + Tailwind │
             └────────┬────────┘
                      │ REST API
                      ▼
             ┌─────────────────┐
             │   Go Backend    │
             │ Handlers        │
             │ Services        │
             │ Repositories    │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │   PostgreSQL    │
             └─────────────────┘
```

Recommended backend flow:

``` text
HTTP Request
     ↓
Router
     ↓
Middleware
     ↓
Handler
     ↓
Service
     ↓
Repository
     ↓
PostgreSQL
```

## Technology Stack

  Layer                 Technology
  --------------------- --------------------
  Frontend              React
  Build Tool            Vite
  Styling               Tailwind CSS
  Routing               React Router
  Icons                 Lucide React
  Backend               Go
  API                   REST
  Database              PostgreSQL
  Authentication        JWT
  Password Hashing      bcrypt or Argon2id
  Containerization      Docker
  Local Orchestration   Docker Compose
  Version Control       Git / GitHub
  API Testing           Postman / Bruno

## Frontend Routes

### Public

``` text
/login
/register
/forgot-password
```

### User

``` text
/dashboard
/parking
/parking/:lotId
/reservations
/reservations/new
/reservations/:id
/vehicles
/sessions
/sessions/:id
/payments
/profile
/settings
```

### Admin

``` text
/admin
/admin/parking-lots
/admin/parking-lots/:id
/admin/parking-bays
/admin/reservations
/admin/sessions
/admin/payments
/admin/users
/admin/vehicles
/admin/reports
/admin/settings
```

## API Design

### Authentication

``` http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

### Users

``` http
GET    /api/v1/users/me
PATCH  /api/v1/users/me
DELETE /api/v1/users/me
```

### Vehicles

``` http
GET    /api/v1/vehicles
POST   /api/v1/vehicles
GET    /api/v1/vehicles/:id
PATCH  /api/v1/vehicles/:id
DELETE /api/v1/vehicles/:id
```

### Parking Lots

``` http
GET    /api/v1/parking-lots
POST   /api/v1/parking-lots
GET    /api/v1/parking-lots/:id
PATCH  /api/v1/parking-lots/:id
DELETE /api/v1/parking-lots/:id
```

### Parking Bays

``` http
GET    /api/v1/parking-lots/:lotId/bays
POST   /api/v1/parking-lots/:lotId/bays
GET    /api/v1/bays/:id
PATCH  /api/v1/bays/:id
DELETE /api/v1/bays/:id
```

### Reservations

``` http
GET    /api/v1/reservations
POST   /api/v1/reservations
GET    /api/v1/reservations/:id
PATCH  /api/v1/reservations/:id
POST   /api/v1/reservations/:id/cancel
```

### Payments

``` http
GET  /api/v1/payments
GET  /api/v1/payments/:id
POST /api/v1/payments
```

### Parking Sessions

``` http
GET  /api/v1/sessions
GET  /api/v1/sessions/:id
POST /api/v1/sessions
POST /api/v1/sessions/:id/start
POST /api/v1/sessions/:id/end
```

### Admin

``` http
GET /api/v1/admin/dashboard
GET /api/v1/admin/users
GET /api/v1/admin/vehicles
GET /api/v1/admin/reservations
GET /api/v1/admin/sessions
GET /api/v1/admin/payments
GET /api/v1/admin/reports
```

## Recommended Project Structure

``` text
parksmart/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── parking/
│   │   │   ├── reservations/
│   │   │   ├── vehicles/
│   │   │   ├── payments/
│   │   │   ├── sessions/
│   │   │   └── admin/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── data/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go
│   ├── internal/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── vehicle/
│   │   ├── parking/
│   │   ├── reservation/
│   │   ├── payment/
│   │   ├── session/
│   │   └── admin/
│   ├── migrations/
│   ├── middleware/
│   ├── models/
│   ├── repository/
│   ├── services/
│   ├── routes/
│   ├── go.mod
│   └── go.sum
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/
│
├── docs/
│   ├── ER_DIAGRAM.md
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## UI / UX Design System

The UI follows a premium smart-mobility SaaS style based on the
project's design reference.

### Visual Language

-   White rounded surfaces.
-   Cool light-gray/blue-gray application background.
-   Deep navy typography.
-   Teal primary accent.
-   Subtle borders.
-   Soft shadows.
-   Clean outline icons.
-   Spacious layouts.
-   Compact sidebar.
-   Map-centric parking discovery.
-   Floating parking-lot information cards.
-   Interactive parking-bay visualization.

### Suggested Colors

``` text
Primary Teal:       #0A9F9A
Deep Navy:          #12243D
Cool Background:   #E9EFF1
White:              #FFFFFF
Muted Gray:         #7B858B
```

### Parking Status Colors

``` text
AVAILABLE     → Green / Teal
RESERVED      → Blue / Teal
OCCUPIED      → Red
MAINTENANCE   → Amber
DISABLED      → Gray
OVERSTAY      → Red
```

The UI should avoid excessive gradients, neon colors, heavy
glassmorphism, and generic dashboard templates.

## Parking Visualization

A central feature of ParkSmart is the interactive parking-floor layout.

``` text
              ENTRANCE
                  ↓

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ A-01 │ │ A-02 │ │ A-03 │ │ A-04 │
│  🚗  │ │      │ │  🚗  │ │      │
└──────┘ └──────┘ └──────┘ └──────┘

──────────── DRIVEWAY ────────────

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ A-05 │ │ A-06 │ │ A-07 │ │ A-08 │
│      │ │  🚗  │ │      │ │  🚗  │
└──────┘ └──────┘ └──────┘ └──────┘
```

Users should be able to:

-   Select a floor.
-   View bay availability.
-   Hover over a bay.
-   Open bay details.
-   Select an available bay.

Admins should additionally be able to:

-   Add bays.
-   Edit bays.
-   Change status.
-   Mark maintenance.
-   Disable bays.

## Map Experience

The map should be a major part of parking discovery.

The visual treatment should use:

-   Pale gray roads.
-   Soft green parks.
-   Pale blue water.
-   Muted labels.
-   Teal/navy parking markers.
-   Floating white information cards.

Example floating card:

``` text
┌───────────────────────────────┐
│ Central City Parking          │
│ 2.4 km                        │
│                               │
│ Available       24            │
│ Occupied        56            │
│                               │
│ ₹30/hour                       │
│                               │
│ [ View Details ] [ Reserve ]  │
└───────────────────────────────┘
```

## Reservation Logic

Reservation flow:

``` text
Select Lot
    ↓
Select Bay
    ↓
Select Vehicle
    ↓
Select Date/Time
    ↓
Review
    ↓
Payment
    ↓
Confirmation
```

The backend must validate:

-   Bay availability.
-   Time conflicts.
-   Vehicle ownership.
-   Valid booking times.
-   Parking-lot operating hours.
-   Reservation status.
-   Payment status.

Advance payment must be successful before confirmation.

## Parking Session Logic

When a session starts:

``` text
Entry_Time = current timestamp
Status = ACTIVE
```

When it ends:

``` text
Exit_Time = current timestamp
Duration = Exit_Time - Entry_Time
```

Overstay:

``` text
if Exit_Time > Reservation.End_Time:
    Overstay_Minutes = Exit_Time - Reservation.End_Time
```

Penalty calculation should be configurable.

Conceptually:

``` text
Penalty = Overstay_Minutes × configured penalty rate
```

## Authentication and Security

Recommended authentication architecture:

``` text
Login
  ↓
Validate credentials
  ↓
Generate access token
  ↓
Authenticated API request
  ↓
JWT middleware
  ↓
Role authorization
```

Security requirements:

-   Never store plaintext passwords.
-   Hash passwords with bcrypt or Argon2id.
-   Validate all input on the backend.
-   Use parameterized SQL queries.
-   Protect admin routes with server-side authorization.
-   Use HTTPS in production.
-   Restrict CORS in production.
-   Keep secrets outside source control.
-   Use secure session/token handling.
-   Add rate limiting where appropriate.
-   Log security-relevant events without exposing secrets.

## Environment Variables

### Frontend

``` env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### Backend

``` env
APP_ENV=development
PORT=8080
DATABASE_URL=postgres://parksmart:password@localhost:5432/parksmart?sslmode=disable
JWT_SECRET=replace-with-a-long-random-secret
CORS_ORIGIN=http://localhost:5173
```

Never commit `.env` files or secrets to Git.

## Local Development

### Prerequisites

Install:

-   Git
-   Node.js
-   npm
-   Go
-   PostgreSQL

Optional:

-   Docker
-   Docker Compose
-   Postman or Bruno

Verify installations:

``` bash
node --version
npm --version
go version
psql --version
git --version
```

## Clone

``` bash
git clone <YOUR_REPOSITORY_URL>
cd parksmart
```

## Frontend Setup

``` bash
cd frontend
npm install
npm run dev
```

Frontend:

``` text
http://localhost:5173
```

## Backend Setup

``` bash
cd backend
go mod download
go run ./cmd/api
```

Backend:

``` text
http://localhost:8080
```

## Database Setup

Create the database:

``` sql
CREATE DATABASE parksmart;
```

Create a user if required:

``` sql
CREATE USER parksmart WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE parksmart TO parksmart;
```

Run schema:

``` bash
psql -U parksmart -d parksmart -f database/schema.sql
```

Run seed data:

``` bash
psql -U parksmart -d parksmart -f database/seed.sql
```

## Docker

Start the full stack:

``` bash
docker compose up --build
```

Stop:

``` bash
docker compose down
```

Remove containers and local volumes:

``` bash
docker compose down -v
```

Use the volume-removal command carefully because it can delete local
database data.

## Testing

### Frontend

``` bash
npm test
npm run build
```

### Backend

``` bash
go test ./...
go test -race ./...
```

### API

Test:

-   Registration.
-   Login.
-   Authorization.
-   Vehicle CRUD.
-   Parking-lot CRUD.
-   Parking-bay CRUD.
-   Availability.
-   Reservation creation.
-   Payment.
-   Session start.
-   Session end.
-   Overstay calculation.
-   Admin authorization.

## Important Test Cases

### Reservation

-   Available bay can be reserved.
-   Occupied bay cannot be reserved.
-   Disabled bay cannot be reserved.
-   Conflicting reservations are rejected.
-   Users cannot reserve another user's vehicle.
-   Reservation cannot be confirmed without required payment.

### Payment

-   Successful payment confirms an eligible reservation.
-   Failed payment does not confirm the reservation.
-   Amount is validated.
-   Transaction ID is stored.
-   Refund status is represented correctly.

### Session

-   Eligible reservation can start a session.
-   Entry time is recorded.
-   Exit time is recorded.
-   Duration is calculated.
-   Overstay is detected.
-   Penalty is generated according to policy.

### Authorization

-   Normal users cannot access admin resources.
-   Admins can access admin resources.
-   Users can only modify their own vehicles and reservations.

## Health Check

Expose:

``` http
GET /health
```

Example:

``` json
{
  "status": "ok"
}
```

The production health check can additionally verify database
connectivity.

## Deployment Architecture

``` text
                    INTERNET
                       |
                       v
                Reverse Proxy
                       |
          ┌────────────┴────────────┐
          │                         │
          v                         v
     React Frontend            Go API Server
                                      |
                                      v
                                PostgreSQL
```

Production checklist:

-   Configure production environment variables.
-   Use HTTPS.
-   Rotate development secrets.
-   Configure CORS.
-   Run migrations.
-   Configure database backups.
-   Configure logging.
-   Configure health checks.
-   Disable development/debug settings.
-   Secure database access.

## Future Enhancements

### RFID Integration

``` text
RFID Reader
     ↓
Vehicle Identification
     ↓
Reservation Validation
     ↓
Parking Session
```

### Automatic Entry / Exit

Potential integrations:

-   RFID readers.
-   ANPR/ALPR cameras.
-   IoT parking sensors.
-   Gate controllers.

### Real-Time Availability

``` text
Parking Sensor
      ↓
IoT Gateway
      ↓
Backend
      ↓
WebSocket / SSE
      ↓
Frontend
```

### Notifications

-   Email.
-   SMS.
-   Push notifications.
-   Reservation reminders.
-   Overstay alerts.
-   Payment notifications.

### Advanced Analytics

-   Occupancy prediction.
-   Demand forecasting.
-   Parking heatmaps.
-   Peak-hour analysis.
-   Parking-lot utilization forecasting.

### Dynamic Pricing

Future pricing can consider:

-   Time.
-   Demand.
-   Occupancy.
-   Location.
-   Events.
-   Parking duration.

### EV Parking

Add:

``` text
EV Bays
Charging Stations
Charging Status
Charging Cost
```

### Accessibility

Support:

-   Accessible-bay filtering.
-   Accessibility metadata.
-   Priority reservation policies.

## Development Roadmap

### Phase 1 --- UI/UX

-   [x] Design system
-   [x] Login UI
-   [x] Dashboard concept
-   [x] Parking map concept
-   [x] Interactive bay concept
-   [ ] Complete user screens
-   [ ] Complete admin screens
-   [ ] Responsive refinement

### Phase 2 --- Frontend

-   [ ] React project structure
-   [ ] Routing
-   [ ] Reusable components
-   [ ] Form validation
-   [ ] State management
-   [ ] Mock services
-   [ ] Loading and error states

### Phase 3 --- Backend

-   [ ] Go API structure
-   [ ] Authentication
-   [ ] Authorization
-   [ ] User APIs
-   [ ] Vehicle APIs
-   [ ] Parking APIs
-   [ ] Reservation APIs
-   [ ] Payment APIs
-   [ ] Session APIs
-   [ ] Admin APIs

### Phase 4 --- Database

-   [ ] PostgreSQL schema
-   [ ] Constraints
-   [ ] Indexes
-   [ ] Migrations
-   [ ] Seed data
-   [ ] Backend integration

### Phase 5 --- Integration

-   [ ] Connect frontend to backend
-   [ ] Authentication integration
-   [ ] Parking availability
-   [ ] Reservation workflow
-   [ ] Payment workflow
-   [ ] Parking-session workflow
-   [ ] Admin workflow

### Phase 6 --- Smart Parking

-   [ ] RFID
-   [ ] ALPR/ANPR
-   [ ] IoT sensors
-   [ ] Real-time occupancy
-   [ ] Automatic entry/exit
-   [ ] Notifications

### Phase 7 --- Production

-   [ ] Docker
-   [ ] CI/CD
-   [ ] HTTPS
-   [ ] Monitoring
-   [ ] Logging
-   [ ] Backups
-   [ ] Production deployment

## Design Principles

### Simplicity

Users should be able to find and reserve parking with minimal steps.

### Visibility

Parking availability should be immediately understandable.

### Reliability

Reservation, payment, and session state should remain consistent.

### Security

Authentication, authorization, and sensitive data must be protected.

### Scalability

The architecture should support multiple parking facilities, floors,
bays, users, and sessions.

### Maintainability

Frontend components, backend services, and database operations should
remain modular.

## Project Status

**Current Stage:** Full-stack development / UI-first implementation

``` text
UI/UX
  ↓
Frontend
  ↓
Backend API
  ↓
Database
  ↓
Integration
  ↓
RFID / IoT
  ↓
Production
```

## Contributing

1.  Fork the repository.
2.  Create a feature branch:

``` bash
git checkout -b feature/your-feature
```

3.  Make changes.
4.  Run tests:

``` bash
npm test
go test ./...
```

5.  Commit:

``` bash
git commit -m "feat: add parking bay availability"
```

6.  Push:

``` bash
git push origin feature/your-feature
```

7.  Open a pull request.

Keep commits focused and document significant architectural changes.

## License

This project is intended for educational, development, and demonstration
purposes unless a separate license is added by the project owners.

------------------------------------------------------------------------

## ParkSmart

**Smart parking. Simple journeys.**

A unified platform for parking discovery, reservations, payments,
parking sessions, and intelligent parking operations.
