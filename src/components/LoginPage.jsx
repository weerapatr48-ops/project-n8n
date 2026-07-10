import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, ShieldCheck, Mail, Lock, User, Briefcase } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const { login } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'sale'
  });

  const getSettings = () => JSON.parse(localStorage.getItem('appSettings') || '{}');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const n8nUrl = getSettings().n8nUrl;
    if (!n8nUrl) {
      setError('กรุณาตั้งค่า n8n URL ในหน้าการตั้งค่าก่อน');
      setLoading(false);
      return;
    }

    if (!isLoginTab && formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    const endpoint = isLoginTab ? '/webhook/auth/login' : '/webhook/auth/register';
    
    try {
      // Create a unified payload
      const payload = isLoginTab 
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password, role: formData.role };

      const res = await fetch(`${n8nUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        if (isLoginTab) {
          login(data.user);
          if (onLoginSuccess) onLoginSuccess();
        } else {
          setSuccessMsg('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
          setIsLoginTab(true);
          setFormData({ ...formData, password: '', confirmPassword: '' });
        }
      } else {
        setError(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch (err) {
      console.error(err);
      // For demo purposes, allow mock login if n8n backend is not fully ready
      if (isLoginTab && formData.email === 'admin@admin.com') {
          login({ name: 'Admin User', email: formData.email, role: 'admin' });
          if (onLoginSuccess) onLoginSuccess();
      } else {
          setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (ลองใช้ admin@admin.com เพื่อทดสอบ)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <ShieldCheck size={40} color="var(--accent-primary)" />
          </div>
          <h1 className="title-lg" style={{ textAlign: 'center', marginBottom: '0.25rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>SmartQuote AI</h1>
          <p className="subtitle" style={{ textAlign: 'center', marginBottom: 0, color: 'rgba(255,255,255,0.9)' }}>ระบบบริหารจัดการธุรกิจอัจฉริยะ</p>
        </div>

        <div style={styles.tabs}>
          <button 
            style={{ ...styles.tab, ...(isLoginTab ? styles.activeTab : {}) }}
            onClick={() => { setIsLoginTab(true); setError(''); setSuccessMsg(''); }}
          >
            เข้าสู่ระบบ
          </button>
          <button 
            style={{ ...styles.tab, ...(!isLoginTab ? styles.activeTab : {}) }}
            onClick={() => { setIsLoginTab(false); setError(''); setSuccessMsg(''); }}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          {successMsg && <div style={styles.successBanner}>{successMsg}</div>}

          {!isLoginTab ? (
            <>
              <div style={styles.gridRow}>
                <div className="input-group" style={styles.compactGroup}>
                  <label style={styles.loginLabel}>ชื่อ-นามสกุล</label>
                  <div style={styles.inputWrapper}>
                    <User size={18} style={styles.inputIcon} />
                    <input 
                      type="text" 
                      name="name"
                      className="input-field" 
                      style={styles.inputWithIcon}
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="input-group" style={styles.compactGroup}>
                  <label style={styles.loginLabel}>อีเมล</label>
                  <div style={styles.inputWrapper}>
                    <Mail size={18} style={styles.inputIcon} />
                    <input 
                      type="email" 
                      name="email"
                      className="input-field" 
                      style={styles.inputWithIcon}
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={styles.gridRow}>
                <div className="input-group" style={styles.compactGroup}>
                  <label style={styles.loginLabel}>รหัสผ่าน</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input 
                      type="password" 
                      name="password"
                      className="input-field" 
                      style={styles.inputWithIcon}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="input-group" style={styles.compactGroup}>
                  <label style={styles.loginLabel}>ยืนยันรหัสผ่าน</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input 
                      type="password" 
                      name="confirmPassword"
                      className="input-field" 
                      style={styles.inputWithIcon}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group" style={styles.compactGroup}>
                <label style={styles.loginLabel}>สิทธิ์การใช้งาน</label>
                <div style={styles.inputWrapper}>
                  <Briefcase size={18} style={styles.inputIcon} />
                  <select 
                    name="role" 
                    className="input-field" 
                    style={styles.inputWithIcon}
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="sale">พนักงานขาย (Sale)</option>
                    <option value="manager">ผู้จัดการ (Manager)</option>
                    <option value="stock_manager">ฝ่ายคลังสินค้า (Stock Manager)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="input-group" style={styles.compactGroup}>
                <label style={styles.loginLabel}>อีเมล</label>
                <div style={styles.inputWrapper}>
                  <Mail size={18} style={styles.inputIcon} />
                  <input 
                    type="email" 
                    name="email"
                    className="input-field" 
                    style={styles.inputWithIcon}
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="input-group" style={styles.compactGroup}>
                <label style={styles.loginLabel}>รหัสผ่าน</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} style={styles.inputIcon} />
                  <input 
                    type="password" 
                    name="password"
                    className="input-field" 
                    style={styles.inputWithIcon}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <span className="pulse">กำลังประมวลผล...</span> : (
              <>
                {isLoginTab ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLoginTab ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    padding: '2rem',
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    overflowY: 'auto'
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '1.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    margin: 'auto'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  logoCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  },
  tabs: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 'var(--radius-lg)',
    padding: '0.25rem',
    marginBottom: '1rem'
  },
  tab: {
    flex: 1,
    padding: '0.5rem',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    borderRadius: 'calc(var(--radius-lg) - 4px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  },
  activeTab: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  compactGroup: {
    marginBottom: '0.75rem'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  loginLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#ffffff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    marginBottom: '0.25rem'
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    color: 'var(--text-muted)'
  },
  inputWithIcon: {
    width: '100%',
    paddingLeft: '3rem',
    background: 'rgba(255,255,255,0.95)',
    color: '#1e293b',
    border: '1px solid rgba(255,255,255,0.2)',
    fontWeight: '500'
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '0.5rem',
    padding: '0.75rem',
    fontSize: '1rem'
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  successBanner: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid #10b981',
    color: '#6ee7b7',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  }
};
