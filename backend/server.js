const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes     = require('./routes/authRoutes');
const vehicleRoutes  = require('./routes/vehicleRoutes');
const bookingRoutes  = require('./routes/bookingRoutes');
const catalogueRoutes = require('./routes/catalogueRoutes');
const expenseRoutes  = require('./routes/expenseRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { initSocket } = require('./socket/socketManager');

const app = express();

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:80',
  'http://localhost',
  'http://localhost:3000',
];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : [];
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow localhost in any form
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow any Render.com subdomain (frontend deployed on Render)
    if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Healthcheck endpoints for Docker and monitoring
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting_or_disconnected',
  });
});

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/vehicles',      vehicleRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/catalogue',     catalogueRoutes);
app.use('/api/expenses',      expenseRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Wrap in native HTTP server so Socket.IO can share the same port
const httpServer = http.createServer(app);

// Attach Socket.IO
initSocket(httpServer);

const PORT     = process.env.PORT     || 5001;
const MONGO_URI = process.env.MONGO_URI;

// Start HTTP server immediately so Render health checks pass, then connect DB
const server = httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (HTTP + Socket.IO)`);
});

if (!MONGO_URI) {
  console.warn('⚠️ WARNING: MONGO_URI environment variable is not defined.');
} else {
  mongoose.connect(MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
    if (authRoutes.seedAdminUser) {
      authRoutes.seedAdminUser();
    }
  }).catch(err => {
    console.error('MongoDB connection error:', err);
  });
}

// Graceful shutdown handling for container termination
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('HTTP & Socket.IO server closed.');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    }).catch(() => process.exit(0));
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
