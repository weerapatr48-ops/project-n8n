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
    // กำหนดให้ทุกคนเป็น admin ตามที่ตกลงกัน
    const userWithAdminRole = { ...userData, role: 'admin' };
    const authData = { token: 'authenticated', user: userWithAdminRole, loginAt: Date.now() };
    localStorage.setItem('auth', JSON.stringify(authData));
    setAuth(authData);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAuth(null);
  };

  const hasRole = (roles) => {
    return !!auth; // ลบการเช็คสิทธิ์ซับซ้อนออก ถือว่าล็อกอินแล้วเข้าได้หมด
  };

  const canAccess = (feature) => {
    return !!auth; // เข้าถึงได้ทุกฟีเจอร์ถ้าล็อกอินแล้ว
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, hasRole, canAccess, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
