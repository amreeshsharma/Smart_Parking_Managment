# syntax=docker/dockerfile:1
# ParkSmart - Smart Parking Management System
# Production Dockerfile for Railway & Cloud Container Deployments

FROM node:20-alpine AS runner

# Create app directory
WORKDIR /app

# Set production environment defaults
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0
ENV FRONTEND_PATH=/app/frontend

# Step 1: Copy backend dependency definitions to leverage Docker layer caching
COPY backend/package.json backend/package-lock.json ./backend/

# Step 2: Install clean production dependencies only
RUN cd backend && npm ci --omit=dev && npm cache clean --force

# Step 3: Copy backend application code
COPY backend ./backend

# Step 4: Copy frontend static assets (Vanilla HTML/CSS/JS)
COPY frontend ./frontend

# Step 5: Switch working directory to backend entry point
WORKDIR /app/backend

# Inform Docker that the container listens on port 5000 by default (overridden by Railway PORT)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/api/health || exit 1

# Start the Node.js production server
CMD ["node", "server.js"]
