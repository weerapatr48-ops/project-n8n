import React from 'react';
import { LayoutDashboard, Database, Settings, FileText, Moon, Sun, Bot, Package, LogOut, FileSignature } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab, isDark, setIsDark, user, onLogout }) {
  const { canAccess } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <LayoutDashboard size={28} />
        SmartQuote AI
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {canAccess('dashboard') && (
          <button 
            className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>แดชบอร์ด</span>
          </button>
        )}

        {canAccess('quote') && (
          <button 
            className={`nav-item ${currentTab === 'quote_maker' ? 'active' : ''}`}
            onClick={() => setCurrentTab('quote_maker')}
          >
            <FileSignature size={20} />
            <span>ออกใบเสนอราคา</span>
          </button>
        )}

        {canAccess('stock') && (
          <button 
            className={`nav-item ${currentTab === 'stock' ? 'active' : ''}`}
            onClick={() => setCurrentTab('stock')}
          >
            <Package size={20} />
            <span>จัดการสต็อก</span>
          </button>
        )}
        
        {canAccess('database') && (
          <button 
            className={`nav-item ${currentTab === 'database' ? 'active' : ''}`}
            onClick={() => setCurrentTab('database')}
          >
            <Database size={20} />
            <span>จัดการฐานข้อมูล</span>
          </button>
        )}

        {canAccess('ai') && (
          <button 
            className={`nav-item ${currentTab === 'ai' ? 'active' : ''}`}
            onClick={() => setCurrentTab('ai')}
          >
            <Bot size={20} />
            <span>AI ผู้ช่วยอัจฉริยะ</span>
          </button>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</p>
          </div>

          <button className="nav-item" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
          </button>
          
          {canAccess('settings') && (
            <button 
              className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentTab('settings')}
            >
              <Settings size={20} />
              <span>การตั้งค่า</span>
            </button>
          )}

          <button className="nav-item" onClick={onLogout} style={{ color: 'var(--danger)' }}>
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
