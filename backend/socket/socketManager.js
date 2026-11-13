/**
 * socketManager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Attaches Socket.IO to the existing Express HTTP server.
 * Authenticates every connection via the same JWT used by REST endpoints.
 * Creates user-specific rooms and an admin room.
 *
 * Exports:
 *   initSocket(httpServer) → void   – call once at server start
 *   getIO()                → Server  – get the socket.io instance anywhere
 *   emitToUser(userId, event, data) – emit to one specific user
 *   emitToAdmins(event, data)       – emit to the admin room
 *   createNotification(payload)     – persist + emit a notification
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

let io = null;

/* ── Initialise ──────────────────────────────────────────────────────────── */

function initSocket(httpServer) {
  const allowed = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:80',
    'http://localhost',
    'http://localhost:3000',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : [])
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow polling fallback for environments that block WS
    transports: ['websocket', 'polling'],
  });

  /* ── JWT Authentication Middleware ──────────────────────────────────────── */
  io.use((socket, next) => {
    try {
      // Client sends token via auth object: socket = io(url, { auth: { token } })
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      // Attach decoded payload to socket – never trust client-supplied role
      socket.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  /* ── Connection Handler ──────────────────────────────────────────────────── */
  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;

    // Every user joins their own private room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // Admins also join the shared admin room
    if (role === 'admin') {
      socket.join('admin:room');
    }

    console.log(`[Socket] Connected – user:${userId} role:${role} socketId:${socket.id}`);

    /* ── Client requests unread notification count on connect ───────────── */
    socket.on('notifications:request_count', async () => {
      try {
        const query = role === 'admin'
          ? { audience: 'admin', read: false }
          : { userId, audience: 'customer', read: false };
        const count = await Notification.countDocuments(query);
        socket.emit('notifications:count', { count });
      } catch (err) {
        console.error('[Socket] notifications:request_count error:', err);
      }
    });

    /* ── Client marks notifications as read ─────────────────────────────── */
    socket.on('notifications:mark_read', async ({ ids } = {}) => {
      try {
        const filter = ids?.length
          ? { _id: { $in: ids } }
          : role === 'admin'
            ? { audience: 'admin' }
            : { userId, audience: 'customer' };
        await Notification.updateMany(filter, { read: true });
        // Re-emit updated count
        const countQuery = role === 'admin'
          ? { audience: 'admin', read: false }
          : { userId, audience: 'customer', read: false };
        const count = await Notification.countDocuments(countQuery);
        socket.emit('notifications:count', { count });
      } catch (err) {
        console.error('[Socket] notifications:mark_read error:', err);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected – user:${userId} reason:${reason}`);
    });
  });

  return io;
}

/* ── Helpers (usable anywhere after initSocket) ──────────────────────────── */

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised – call initSocket first');
  return io;
}

/**
 * Emit an event to a specific user's private room.
 * @param {string} userId  – MongoDB user _id as string
 * @param {string} event   – event name
 * @param {object} data    – payload
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all connected administrators.
 */
function emitToAdmins(event, data) {
  if (!io) return;
  io.to('admin:room').emit(event, data);
}

/**
 * Persist a notification to the database, then emit it in real-time.
 *
 * @param {object} payload
 * @param {string|null} payload.userId     – recipient user id (null = admin-only)
 * @param {'admin'|'customer'} payload.audience
 * @param {string} payload.type
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {object} [payload.data]          – extra context
 */
async function createNotification(payload) {
  try {
    const doc = await Notification.create({
      userId:   payload.userId   || null,
      audience: payload.audience || 'customer',
      type:     payload.type     || 'general',
      title:    payload.title,
      message:  payload.message,
      data:     payload.data     || {},
    });

    const event = 'notification:created';
    if (payload.audience === 'admin') {
      emitToAdmins(event, doc.toObject());
    } else if (payload.userId) {
      emitToUser(String(payload.userId), event, doc.toObject());
    }

    // Also refresh the unread count badge
    if (io) {
      if (payload.audience === 'admin') {
        const count = await Notification.countDocuments({ audience: 'admin', read: false });
        io.to('admin:room').emit('notifications:count', { count });
      } else if (payload.userId) {
        const count = await Notification.countDocuments({ userId: payload.userId, audience: 'customer', read: false });
        io.to(`user:${payload.userId}`).emit('notifications:count', { count });
      }
    }

    return doc;
  } catch (err) {
    console.error('[Socket] createNotification error:', err);
    return null;
  }
}

module.exports = { initSocket, getIO, emitToUser, emitToAdmins, createNotification };
