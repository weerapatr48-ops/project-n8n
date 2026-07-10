import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.token && parsed?.user) setAuth(parsed);
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const authData = { token: 'authenticated', user: userData, loginAt: Date.now() };
    localStorage.setItem('auth', JSON.stringify(authData));
    setAuth(authData);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAuth(null);
  };

  const hasRole = (roles) => {
    if (!auth?.user?.role) return false;
    if (typeof roles === 'string') return auth.user.role === roles;
    return roles.includes(auth.user.role);
  };

  const canAccess = (feature) => {
    const role = auth?.user?.role;
    const rules = {
      dashboard:  ['admin', 'manager', 'user'],
      quote:      ['admin', 'manager', 'user'],
      ai:         ['admin', 'manager', 'user'],
      database:   ['admin', 'manager'],
      stock:      ['admin', 'manager'],
      settings:   ['admin'],
    };
    return rules[feature]?.includes(role) ?? false;
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, hasRole, canAccess, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
