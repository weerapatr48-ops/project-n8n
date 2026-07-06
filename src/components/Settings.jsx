import React, { useState, useEffect } from 'react';
import { Save, Building2, Link as LinkIcon, Image as ImageIcon, RefreshCw } from 'lucide-react';

const getN8nUrl = () => {
  try {
    const s = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return s.n8nUrl || '';
  } catch {
    return '';
  }
};

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: '',
    companyTaxId: '',
    companyAddress: '',
    companyPhone: '',
    companyLogo: ''
  });
  
  const [n8nUrl, setN8nUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // โหลด n8n URL และตั้งค่าจาก localStorage ก่อน
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('appSettings') || '{}');
      setN8nUrl(s.n8nUrl || '');
      
      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      if (localProfile.companyName) {
        setSettings(prev => ({ ...prev, ...localProfile }));
      }
    } catch {}
  }, []);

  // ดึงข้อมูลบริษัทจาก Google Sheets ผ่าน n8n
  const fetchSettings = async () => {
    const url = getN8nUrl();
    
    setIsLoading(true);
    try {
      const response = await fetch(`${url}/webhook/settings`);
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result) && result[0]?.json ? result[0].json : (Array.isArray(result) ? result[0] : result);
        if (data) {
          const newSettings = {
            companyName: data['Company Name'] || '',
            companyTaxId: data['Tax ID'] || '',
            companyAddress: data['Address'] || '',
            companyPhone: data['Phone'] || '',
            companyLogo: data['Logo URL'] || ''
          };
          setSettings(newSettings);
          localStorage.setItem('companyProfile', JSON.stringify(newSettings));
        }
      } else {
        alert(`ดึงข้อมูลไม่สำเร็จ (Status: ${response.status}) โปรดตรวจสอบว่าเปิด Active ใน n8n หรือยัง`);
      }
    } catch (e) {
      console.log('Failed to fetch settings from n8n');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [n8nUrl]); // โหลดใหม่ถ้า n8nUrl เปลี่ยน

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleN8nUrlChange = (val) => {
    setN8nUrl(val);
    localStorage.setItem('appSettings', JSON.stringify({ n8nUrl: val }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    // 1. Save locally to ensure UI works immediately
    localStorage.setItem('appSettings', JSON.stringify({ n8nUrl }));
    localStorage.setItem('companyProfile', JSON.stringify(settings));
    
    // 2. Save Company Info to Google Sheets via n8n
    const url = getN8nUrl();
    try {
      const response = await fetch(`${url}/webhook/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) {
        alert(`บันทึกไม่สำเร็จ (Status: ${response.status}) โปรดตรวจสอบ n8n`);
        return; // หยุดการทำงานถ้าบันทึกไม่สำเร็จ
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ n8n');
      return;
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-lg" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>การตั้งค่าระบบ</h1>
          <p className="subtitle">ปรับแต่งข้อมูลบริษัทและการเชื่อมต่อ</p>
        </div>
        <button className="btn-primary" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={fetchSettings} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'pulse' : ''} /> ดึงข้อมูลล่าสุด
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} color="var(--accent-primary)" />
          ข้อมูลบริษัท (ถูกเก็บลง Google Sheets)
        </h2>
        
        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div className="input-group">
            <label className="input-label">ชื่อบริษัท</label>
            <input type="text" className="input-field" placeholder="บริษัท เอบีซี จำกัด" value={settings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">เลขประจำตัวผู้เสียภาษี</label>
            <input type="text" className="input-field" placeholder="01055xxxxxxxx" value={settings.companyTaxId} onChange={(e) => handleChange('companyTaxId', e.target.value)} />
          </div>
          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">ที่อยู่บริษัท</label>
            <input type="text" className="input-field" placeholder="123 ถนนสุขุมวิท..." value={settings.companyAddress} onChange={(e) => handleChange('companyAddress', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">เบอร์โทรศัพท์ติดต่อ</label>
            <input type="text" className="input-field" placeholder="02-123-4567" value={settings.companyPhone} onChange={(e) => handleChange('companyPhone', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ImageIcon size={14} /> URL โลโก้บริษัท (ถ้ามี)
            </label>
            <input type="text" className="input-field" placeholder="https://example.com/logo.png" value={settings.companyLogo} onChange={(e) => handleChange('companyLogo', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LinkIcon size={20} color="var(--accent-primary)" />
          การเชื่อมต่อระบบ (ถูกเก็บในเครื่องนี้เท่านั้น)
        </h2>
        <div className="input-group">
          <label className="input-label">n8n Webhook URL (ปล่อยว่างได้ถ้าใช้ Proxy)</label>
          <input type="text" className="input-field" placeholder="http://localhost:5678" value={n8nUrl} onChange={(e) => handleN8nUrlChange(e.target.value)} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>ใส่ URL เต็มของ n8n กรณีติดตั้งไว้บน Cloud</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        {isSaved && <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 500 }}>บันทึกสำเร็จ!</span>}
        <button className="btn-primary" onClick={handleSave} style={{ padding: '0.8rem 2rem' }}>
          <Save size={18} /> บันทึกการตั้งค่า
        </button>
      </div>
    </div>
  );
}
