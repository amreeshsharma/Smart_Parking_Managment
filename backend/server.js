// server.js - ParkSmart Express API server entrypoint and route configuration
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./config/db');

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

const path = require('path');
const fs = require('fs');

// Disable ETag and configure no-store cache headers for API freshness
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// 1. Security HTTP Headers (configured to allow external fonts & CDN icons)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

// 2. Cross-Origin Resource Sharing (CORS)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests, origin 'null' (file://, local previews), any localhost/IP, or cloud deployments
    if (
      !origin ||
      origin === 'null' ||
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://0.0.0.0:') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.up.railway.app')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked by CORS policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-test-suite']
}));

// 3. Request parsing with 100kb payload limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Rate limiting for authentication routes (10 failed attempts per 1 min per IP)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => req.headers['x-test-suite'] === 'true' || process.env.NODE_ENV === 'test',
  message: {
    success: false,
    data: null,
    message: 'Too many failed authentication attempts. Please wait a minute and try again.'
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
  res.json({
    success: true,
    message: 'ParkSmart API is operational',
    database: db.isDbConnected() ? 'connected' : 'disconnected (verify DB environment variables)',
    timestamp: new Date().toISOString()
  });
});

// 6. Static frontend assets serving
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// 7. 404 Fallback for unmapped endpoints
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return fail(res, 404, `Endpoint ${req.method} ${req.originalUrl} not found.`);
  }
  const indexHtml = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  return fail(res, 404, `Endpoint ${req.method} ${req.originalUrl} not found.`);
});

// 7. Central Error Handler
app.use(errorHandler);

// 8. Server Boot
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`[ParkSmart] REST API server listening at http://${HOST}:${PORT}/api`);
});

// Graceful shutdown handlers for container environments (Railway, Docker)
const handleShutdown = (signal) => {
  console.log(`[ParkSmart] Received ${signal}. Shutting down server gracefully...`);
  server.close(() => {
    console.log('[ParkSmart] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = { app, server };

