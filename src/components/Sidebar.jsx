import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, Settings, FileText, Moon, Sun, Bot, Package, LogOut, FileSignature, History, EyeOff, KanbanSquare, Truck, PackageCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentTab, setCurrentTab, isDark, setIsDark, user, onLogout }) {
  const { canAccess } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [secretMode, setSecretMode] = useState(() => localStorage.getItem('secretMode') === '1');
  const [destroyEyes, setDestroyEyes] = useState(false);

  useEffect(() => {
    const handleSecretMode = () => setSecretMode(localStorage.getItem('secretMode') === '1');
    window.addEventListener('secretModeToggle', handleSecretMode);
    return () => window.removeEventListener('secretModeToggle', handleSecretMode);
  }, []);

  useEffect(() => {
    let interval;
    const props = ['--bg-primary', '--bg-secondary', '--bg-tertiary', '--text-primary', '--accent-primary', '--border-color', '--glass-bg'];
    
    if (destroyEyes) {
      interval = setInterval(() => {
        const randomColor = () => `rgb(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)})`;
        props.forEach(p => document.body.style.setProperty(p, randomColor()));
      }, 150); 
    } else {
      props.forEach(p => document.body.style.removeProperty(p));
    }
    
    return () => {
      clearInterval(interval);
      props.forEach(p => document.body.style.removeProperty(p));
    };
  }, [destroyEyes]);

  return (
    <>
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



        {canAccess('ai') && (
          <button 
            className={`nav-item ${currentTab === 'ai' ? 'active' : ''}`}
            onClick={() => setCurrentTab('ai')}
          >
            <Bot size={20} />
            <span>AI ผู้ช่วยอัจฉริยะ</span>
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

        {canAccess('quote') && (
          <button 
            className={`nav-item ${currentTab === 'quote_history' ? 'active' : ''}`}
            onClick={() => setCurrentTab('quote_history')}
          >
            <History size={20} />
            <span>ประวัติใบเสนอราคา</span>
          </button>
        )}



        {canAccess('stock') && (
          <button 
            className={`nav-item ${currentTab === 'stock' ? 'active' : ''}`}
            onClick={() => setCurrentTab('stock')}
          >
            <Package size={20} />
            <span>จัดการสต็อกสินค้า</span>
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
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</p>
          </div>

          <div 
            className="nav-item" 
            onClick={() => setIsDark(!isDark)} 
            style={{ justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isDark ? <Moon size={20} /> : <Sun size={20} />}
              <span>{isDark ? 'โหมดมืด' : 'โหมดสว่าง'}</span>
            </div>
            <div style={{
              width: '40px',
              height: '22px',
              background: isDark ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderRadius: '20px',
              position: 'relative',
              transition: 'background 0.3s'
            }}>
              <div style={{
                width: '18px',
                height: '18px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isDark ? '20px' : '2px',
                transition: 'left 0.3s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>
          </div>
          
          {secretMode && (
            <div 
              className="nav-item" 
              onClick={() => setDestroyEyes(!destroyEyes)} 
              style={{ justifyContent: 'space-between', cursor: 'pointer', color: destroyEyes ? 'var(--danger)' : 'var(--text-secondary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <EyeOff size={20} />
                <span style={{ fontWeight: 800 }}>ทำลายดวงตา</span>
              </div>
              <div style={{
                width: '40px',
                height: '22px',
                background: destroyEyes ? 'var(--danger)' : 'var(--text-muted)',
                borderRadius: '20px',
                position: 'relative',
                transition: 'background 0.3s'
              }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  background: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: destroyEyes ? '20px' : '2px',
                  transition: 'left 0.1s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }} />
              </div>
            </div>
          )}
          
          {canAccess('settings') && (
            <button 
              className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentTab('settings')}
            >
              <Settings size={20} />
              <span>การตั้งค่า</span>
            </button>
          )}

          <button className="nav-item" onClick={() => setShowLogoutConfirm(true)} style={{ color: 'var(--danger)' }}>
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </nav>
    </aside>

    {showLogoutConfirm && (
      <div style={styles.modalOverlay}>
        <div className="glass-card" style={styles.modalCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--danger)' }}>
            <LogOut size={28} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>ยืนยันการออกจากระบบ</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              className="btn-primary" 
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              onClick={() => setShowLogoutConfirm(false)}
            >
              ยกเลิก
            </button>
            <button 
              className="btn-primary" 
              style={{ background: 'var(--danger)' }}
              onClick={() => {
                setShowLogoutConfirm(false);
                onLogout();
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modalCard: {
    width: '90%',
    maxWidth: '400px',
    background: 'var(--bg-secondary)',
    padding: '2rem'
  }
};
