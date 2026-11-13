import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

/**
 * Retrieves the current session synchronously.
 * 1. Checks tab-scoped sessionStorage first (allows Admin & Customer tabs simultaneously)
 * 2. Falls back to persistent localStorage (restores session after browser restart)
 */
const getStoredUser = () => {
  try {
    // Check sessionStorage first (tab-scoped)
    const sessionData = sessionStorage.getItem('userInfo');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed && parsed.token && parsed.role) {
        return parsed;
      }
    }

    // Fallback to localStorage (cross-tab / persistent)
    const localData = localStorage.getItem('userInfo');
    if (localData) {
      const parsed = JSON.parse(localData);
      if (parsed && parsed.token && parsed.role) {
        // Cache into current tab's sessionStorage
        sessionStorage.setItem('userInfo', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to read stored session:', err);
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  // Synchronous initialization prevents race conditions and flicker on page refresh
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(false);

  // Sync state if user logs out or updates in another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userInfo') {
        if (!e.newValue) {
          // If removed from localStorage and not preserved in sessionStorage, logout
          if (!sessionStorage.getItem('userInfo')) {
            setUser(null);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback((userData) => {
    setUser(userData);
    try {
      sessionStorage.setItem('userInfo', JSON.stringify(userData));
      localStorage.setItem('userInfo', JSON.stringify(userData));
    } catch (err) {
      console.warn('[Auth] Failed to write session to storage:', err);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      sessionStorage.removeItem('userInfo');
      // Only remove from localStorage if it matches the current user
      const localData = localStorage.getItem('userInfo');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed?._id === user?._id || parsed?.email === user?.email) {
          localStorage.removeItem('userInfo');
        }
      }
    } catch (err) {
      console.warn('[Auth] Failed to clear session from storage:', err);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
