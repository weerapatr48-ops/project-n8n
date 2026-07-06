import React, { useState } from 'react';
import { Send, Bot, Sparkles, Printer, Save, FilePlus, Trash2 } from 'lucide-react';

const getN8nUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return settings.n8nUrl || '';
  } catch {
    return '';
  }
};

export default function QuotationMaker() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [issuerInfo, setIssuerInfo] = useState({
    companyName: '',
    companyTaxId: '',
    companyAddress: '',
    companyPhone: '',
    companyLogo: ''
  });

  React.useEffect(() => {
    const fetchIssuerInfo = async () => {
      const url = getN8nUrl();
      try {
        const response = await fetch(`${url}/webhook/settings`);
        if (response.ok) {
          const result = await response.json();
          const data = Array.isArray(result) && result[0]?.json ? result[0].json : (Array.isArray(result) ? result[0] : result);
          if (data) {
            setIssuerInfo({
              companyName: data['Company Name'] || 'ตั้งค่าชื่อบริษัทในเมนู การตั้งค่า',
              companyTaxId: data['Tax ID'] || '',
              companyAddress: data['Address'] || '',
              companyPhone: data['Phone'] || '',
              companyLogo: data['Logo URL'] || ''
            });
          }
        }
      } catch (e) {
        console.log('Failed to fetch settings');
      }
    };
    fetchIssuerInfo();
  }, []);
  
  // State for form fields
  const [customerInfo, setCustomerInfo] = useState({
    name: 'ACA INDUSTRIAL TOOLS CO.,LTD. (HEAD OFFICE)',
    taxId: '205545008312',
    address: '68 MOO 1 TAMBON NAPA , AMPHUR MUNGCHONBURI , CHONBURI 20000',
    contact: 'K. Muttana (ปิ๋ม)',
    date: new Date().toISOString().split('T')[0]
  });

  const [items, setItems] = useState([
    { id: 1, description: 'เครื่องจักรอุตสาหกรรม Type A', quantity: 2, price: 150000 }
  ]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // เรียก API ไปยัง n8n Webhook
      const response = await fetch(`${getN8nUrl()}/webhook/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true' // จำเป็นสำหรับ localtunnel เพื่อข้ามหน้าเตือน
        },
        body: JSON.stringify({ prompt: prompt })
      });

      if (response.ok) {
        const data = await response.json();
        
        // สมมติว่า n8n ส่งข้อมูลโครงสร้างนี้กลับมา (AI ประมวลผลเสร็จแล้ว)
        if (data.customerInfo) setCustomerInfo(data.customerInfo);
        if (data.items) {
          const formattedItems = data.items.map((it, idx) => ({ ...it, id: idx + 1 }));
          setItems(formattedItems);
        }
        setShowForm(true);
      } else {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับ n8n (ตรวจสอบให้แน่ใจว่า Webhook URL และ Method ถูกต้อง)');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ n8n ได้ครับ');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInfoChange = (field, value) => {
    setCustomerInfo({ ...customerInfo, [field]: value });
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: newId, description: '', quantity: 1, price: 0 }]);
  };
  
  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2 }).format(amount);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="title-lg">ออกใบเสนอราคาอัจฉริยะ</h1>
        <p className="subtitle">สั่งงานให้ AI ดึงข้อมูลจากฐานข้อมูลและร่างใบเสนอราคาให้คุณ</p>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleGenerate} className="ai-prompt-box">
          <Bot size={24} color="var(--accent-primary)" />
          <input 
            type="text" 
            className="ai-input"
            placeholder="ตัวอย่าง: สร้างใบเสนอราคาให้บริษัท A.E.S. TECHNOLOGY เครื่องจักร 3 ตัว ตัวละ 50,000" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <button type="submit" className="btn-primary" disabled={isGenerating}>
            {isGenerating ? (
              <span className="pulse">AI กำลังทำงาน...</span>
            ) : (
              <>
                <Sparkles size={18} />
                Generate
              </>
            )}
          </button>
        </form>
      </div>

      {showForm && (
        <div className="glass-card" style={{ animation: 'pulse 0.5s ease-out 1 forwards', animationName: 'fade-in' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>แบบร่างใบเสนอราคา (สามารถแก้ไขได้)</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <Save size={16} /> บันทึกร่าง
              </button>
              <button className="btn-primary" style={{ backgroundColor: 'var(--success)' }}>
                <Printer size={16} /> ออกเอกสาร (PDF)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {issuerInfo.companyLogo && (
              <img src={issuerInfo.companyLogo} alt="Logo" style={{ maxHeight: '80px', objectFit: 'contain', borderRadius: '4px' }} />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--accent-primary)' }}>{issuerInfo.companyName}</h3>
              <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{issuerInfo.companyAddress}</p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {issuerInfo.companyTaxId && <span><strong>เลขประจำตัวผู้เสียภาษี:</strong> {issuerInfo.companyTaxId}</span>}
                {issuerInfo.companyPhone && <span><strong>โทร:</strong> {issuerInfo.companyPhone}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.5, margin: 0 }}>QUOTATION</h2>
              <p style={{ margin: '0.5rem 0 0 0', fontWeight: 600 }}>ใบเสนอราคา</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '2px solid var(--accent-light)', paddingBottom: '0.5rem', display: 'inline-block' }}>ข้อมูลลูกค้า</h3>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">ชื่อลูกค้า / บริษัท</label>
              <input type="text" className="input-field" value={customerInfo.name} onChange={(e) => handleInfoChange('name', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">เลขประจำตัวผู้เสียภาษี</label>
              <input type="text" className="input-field" value={customerInfo.taxId} onChange={(e) => handleInfoChange('taxId', e.target.value)} />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">ที่อยู่</label>
              <input type="text" className="input-field" value={customerInfo.address} onChange={(e) => handleInfoChange('address', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">ผู้ติดต่อ</label>
              <input type="text" className="input-field" value={customerInfo.contact} onChange={(e) => handleInfoChange('contact', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">วันที่เสนอราคา</label>
              <input type="date" className="input-field" value={customerInfo.date} onChange={(e) => handleInfoChange('date', e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>รายการสินค้า</h3>
              <button onClick={addItem} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <FilePlus size={16} /> เพิ่มรายการ
              </button>
            </div>
            
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ลำดับ</th>
                    <th>รายละเอียด</th>
                    <th>จำนวน</th>
                    <th>ราคาต่อหน่วย</th>
                    <th>รวมเป็นเงิน</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <input 
                          type="text" 
                          className="input-field" 
                          style={{ padding: '0.4rem', width: '100%' }} 
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="input-field" 
                          style={{ padding: '0.4rem', width: '80px' }} 
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                          min="1"
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="input-field" 
                          style={{ padding: '0.4rem', width: '120px' }} 
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                          min="0"
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(Number(item.quantity) * Number(item.price))}
                      </td>
                      <td>
                        <button 
                          onClick={() => removeItem(item.id)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Empty row for totals */}
                  <tr>
                    <td colSpan="3" style={{ borderBottom: 'none' }}></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, borderBottom: 'none' }}>ยอดรวมสุทธิ</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)', borderBottom: 'none', fontSize: '1.1rem' }}>
                      {formatCurrency(calculateTotal())}
                    </td>
                    <td style={{ borderBottom: 'none' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
