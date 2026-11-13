const mongoose = require('mongoose');

/**
 * Notification model – stores real-time notifications for users and admins.
 * Notifications are created by the backend when key events occur and
 * are delivered over Socket.IO; they persist so users see them after login.
 */
const notificationSchema = new mongoose.Schema({
  // Recipient: either a specific user _id or null for broadcast-to-admins
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // 'admin' | 'customer' – which audience sees this notification
  audience: { type: String, enum: ['admin', 'customer'], required: true },

  // Short machine-readable type for icon/colour rendering
  type: {
    type: String,
    enum: [
      'booking:created',
      'booking:confirmed',
      'booking:rescheduled',
      'booking:cancelled',
      'service:started',
      'service:completed',
      'expenditure:updated',
      'user:registered',
      'general',
    ],
    default: 'general',
  },

  title:   { type: String, required: true },
  message: { type: String, required: true },

  // Extra context – booking id, vehicle name, amount etc.
  data: { type: mongoose.Schema.Types.Mixed, default: {} },

  read: { type: Boolean, default: false },
}, { timestamps: true });

// Index for efficient per-user queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
