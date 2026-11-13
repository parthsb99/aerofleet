/**
 * SocketContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single, authenticated Socket.IO connection for the whole app.
 *
 * Usage:
 *   const socket = useSocket();
 *   useEffect(() => {
 *     if (!socket) return;
 *     socket.on('service:updated', handler);
 *     return () => socket.off('service:updated', handler);
 *   }, [socket]);
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SocketContext = createContext(null);

import { SOCKET_URL } from '../config/api.js';

export function SocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect only when user is authenticated
    if (!user?.token) {
      // Disconnect any existing socket if the user logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Avoid duplicate connections (e.g. StrictMode double mount)
    if (socketRef.current?.connected) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      // Request unread notification count immediately after connecting
      newSocket.emit('notifications:request_count');
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    newSocket.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempts');
      // Re-request notification count after reconnect
      newSocket.emit('notifications:request_count');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  // Re-connect whenever the user (token) changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * useSocket() – returns the connected socket instance, or null if not ready.
 */
export function useSocket() {
  return useContext(SocketContext);
}

export default SocketContext;
