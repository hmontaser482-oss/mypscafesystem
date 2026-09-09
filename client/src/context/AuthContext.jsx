import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ps_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ps_token') || null);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync token header
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  };

  const checkActiveShift = async () => {
    if (!token) return;
    try {
      const res = await authFetch('/api/shifts/current');
      const data = await res.json();
      if (data.success) {
        setActiveShift(data.activeShift);
      }
    } catch (e) {}
  };

  const refreshMe = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setActiveShift(data.openShift);
        localStorage.setItem('ps_user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch (err) {
      console.error('Auth verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'فشل تسجيل الدخول');
    }

    setToken(data.token);
    setUser(data.user);
    setActiveShift(data.openShift);
    localStorage.setItem('ps_token', data.token);
    localStorage.setItem('ps_user', JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveShift(null);
    localStorage.removeItem('ps_token');
    localStorage.removeItem('ps_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, activeShift, setActiveShift, login, logout, refreshMe, checkActiveShift, authFetch, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
