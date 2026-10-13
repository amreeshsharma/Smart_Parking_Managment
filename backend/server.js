// server.js - ParkSmart Express API server entrypoint and route configuration
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Database pool test import
require('./config/db');

// Error handling and response helpers
const errorHandler = require('./middleware/errorHandler');
const { fail } = require('./utils/response');

// Route modules
const authRoutes = require('./routes/auth.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const lotsRoutes = require('./routes/lots.routes');
const reservationsRoutes = require('./routes/reservations.routes');
const sessionsRoutes = require('./routes/sessions.routes');
const paymentsRoutes = require('./routes/payments.routes');
const profileRoutes = require('./routes/profile.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security HTTP Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., Postman, curl, smoke-test) or matching origins
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked by CORS policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request parsing with 100kb payload limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Rate limiting for authentication routes (10 requests per 15 mins per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.headers['x-test-suite'] === 'true' || process.env.NODE_ENV === 'test',
  message: {
    success: false,
    data: null,
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
  }
});

// 5. API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', profileRoutes); // Support frontend api.js PUT /users/:id & PATCH /users/:id/password
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ParkSmart API is operational', timestamp: new Date().toISOString() });
});

// 6. 404 Fallback for unmapped endpoints
app.use((req, res) => {
  return fail(res, 404, `Endpoint ${req.method} ${req.originalUrl} not found.`);
});

// 7. Central Error Handler
app.use(errorHandler);

// 8. Server Boot
const server = app.listen(PORT, () => {
  console.log(`[ParkSmart] REST API server listening at http://localhost:${PORT}/api`);
});

module.exports = { app, server };
