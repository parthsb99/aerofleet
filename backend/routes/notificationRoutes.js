const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/authMiddleware');

/* ── GET /api/notifications – fetch for current user or admin ── */
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? { audience: 'admin' }
      : { userId: req.user.id, audience: 'customer' };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ── PATCH /api/notifications/mark-read – mark all or specific ones as read ── */
router.patch('/mark-read', protect, async (req, res) => {
  try {
    const { ids } = req.body; // optional array of _ids
    const isAdmin = req.user.role === 'admin';

    let filter;
    if (ids?.length) {
      filter = { _id: { $in: ids } };
    } else {
      filter = isAdmin
        ? { audience: 'admin' }
        : { userId: req.user.id, audience: 'customer' };
    }

    await Notification.updateMany(filter, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ── GET /api/notifications/count – unread count ── */
router.get('/count', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? { audience: 'admin', read: false }
      : { userId: req.user.id, audience: 'customer', read: false };
    const count = await Notification.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
