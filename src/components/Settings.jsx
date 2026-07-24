import React, { useState, useEffect } from 'react';
import { Save, Building2, Link as LinkIcon, Image as ImageIcon, RefreshCw, Bot } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Settings() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [settings, setSettings] = useState({
    companyName: '',
    companyTaxId: '',
    companyAddress: '',
    companyPhone: '',
    companyLogo: ''
  });
  

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // โหลด ฐานข้อมูล URL และตั้งค่าจาก localStorage ก่อน
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('appSettings') || '{}');
      setGeminiApiKey(s.geminiApiKey || '');

      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      if (localProfile.companyName) {
        setSettings(prev => ({ ...prev, ...localProfile }));
      }
    } catch {}
  }, []);

  // ดึงข้อมูลบริษัทจาก Google Sheets ผ่าน ฐานข้อมูล
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { GAS_URL } = await import('../context/DataContext.jsx');
      const response = await fetch(`${GAS_URL}?sheet=Settings&t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        const data = Array.isArray(result) && result.length > 0 ? result[0] : result;
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
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: `ดึงข้อมูลไม่สำเร็จ (Status: ${response.status}) โปรดตรวจสอบว่าเปิด Active ใน ฐานข้อมูล หรือยัง` });
      }
    } catch (e) {
      console.log('Failed to fetch settings from ฐานข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []); // โหลดครั้งเดียว

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };


  const handleSave = async () => {
    // 1. Save locally to ensure UI works immediately
    localStorage.setItem('appSettings', JSON.stringify({ geminiApiKey }));
    localStorage.setItem('companyProfile', JSON.stringify(settings));
    
    // 2. Save Company Info to Google Sheets via GAS
    try {
      const { GAS_URL } = await import('../context/DataContext.jsx');
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update',
          sheet: 'Settings',
          idKey: 'Company Name',
          data: {
             'Company Name': settings.companyName,
             'Tax ID': settings.companyTaxId,
             'Address': settings.companyAddress,
             'Phone': settings.companyPhone,
             'Logo URL': settings.companyLogo
          }
        })
      });
      if (!response.ok) {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: `บันทึกไม่สำเร็จ (Status: ${response.status}) โปรดตรวจสอบการเชื่อมต่อ` });
        return; // หยุดการทำงานถ้าบันทึกไม่สำเร็จ
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ ฐานข้อมูล' });
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
          <Bot size={20} color="var(--accent-primary)" />
          การตั้งค่า AI (Gemini API Key)
        </h2>
        <div className="input-group">
          <label className="input-label">Gemini API Key (ได้จาก Google AI Studio)</label>
          <input 
            type="password" 
            className="input-field" 
            placeholder="AIzaSy..." 
            value={geminiApiKey} 
            onChange={(e) => {
              setGeminiApiKey(e.target.value);
              setIsSaved(false);
            }} 
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>คีย์นี้จะถูกเก็บไว้ในเครื่องของคุณเท่านั้น เพื่อความปลอดภัย</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
        {isSaved && <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 500 }}>บันทึกสำเร็จ!</span>}
        <button className="btn-primary" onClick={handleSave} style={{ padding: '0.8rem 2rem' }}>
          <Save size={18} /> บันทึกการตั้งค่า
        </button>
      </div>
      
      {/* Secret Mode Toggle */}
      <div style={{ marginTop: '4rem', opacity: 0.03, display: 'flex', justifyContent: 'center', transition: 'opacity 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0.03'} className="no-print">
        <label style={{ cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" onChange={(e) => {
            if (e.target.checked) localStorage.setItem('secretMode', '1');
            else localStorage.removeItem('secretMode');
            window.dispatchEvent(new Event('secretModeToggle'));
          }} defaultChecked={localStorage.getItem('secretMode') === '1'} />
          {' Unlock Developer Features'}
        </label>
      </div>
    </div>
  );
}
