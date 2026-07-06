import React from 'react';
import { LayoutDashboard, Database, Settings, FileText, Moon, Sun } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, isDark, setIsDark }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <LayoutDashboard size={28} />
        SmartQuote AI
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <button 
          className={`nav-item ${currentTab === 'quote' ? 'active' : ''}`}
          onClick={() => setCurrentTab('quote')}
        >
          <FileText size={20} />
          <span>AI Assistant</span>
        </button>
        
        <button 
          className={`nav-item ${currentTab === 'database' ? 'active' : ''}`}
          onClick={() => setCurrentTab('database')}
        >
          <Database size={20} />
          <span>จัดการฐานข้อมูล</span>
        </button>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="nav-item" onClick={() => setIsDark(!isDark)}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
          </button>
          
          <button 
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
            <Settings size={20} />
            <span>การตั้งค่า</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
