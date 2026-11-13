/**
 * NotificationContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Maintains the unread notification count and notification list in one place.
 * Updated by Socket.IO events so both Topbar (user) and AdminTopbar (admin)
 * can subscribe without duplicating socket listeners.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  refreshNotifications: () => {},
});

import { API_BASE as API } from '../config/api.js';

export function NotificationProvider({ children }) {
  const { user } = useContext(AuthContext);
  const socket = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /* ── Fetch notifications from REST API ─────────────────────────────────── */
  const refreshNotifications = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn('[Notifications] Fetch error:', err);
    }
  }, [user?.token]);

  /* ── Load on mount / user change ───────────────────────────────────────── */
  useEffect(() => {
    if (user?.token) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.token, refreshNotifications]);

  /* ── Socket listeners ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    // Server pushes updated unread count
    const handleCount = ({ count }) => {
      setUnreadCount(count);
    };

    // New notification arrives – prepend it and bump count
    const handleNew = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notifications:count', handleCount);
    socket.on('notification:created', handleNew);

    return () => {
      socket.off('notifications:count', handleCount);
      socket.off('notification:created', handleNew);
    };
  }, [socket]);

  /* ── Mark all as read ──────────────────────────────────────────────────── */
  const markAllRead = useCallback(async () => {
    if (!user?.token) return;
    try {
      await fetch(`${API}/api/notifications/mark-read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      // Tell socket to sync count
      if (socket) socket.emit('notifications:mark_read', {});
    } catch (err) {
      console.warn('[Notifications] Mark read error:', err);
    }
  }, [user?.token, socket]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export default NotificationContext;
