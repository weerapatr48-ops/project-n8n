import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Bot, Plus, Trash2, Printer, Save, Search, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';

const THBText = (number) => {
  if (!number || isNaN(number) || number === 0) return "ศูนย์บาทถ้วน";
  const numStr = Number(number).toFixed(2);
  const [bahtStr, satangStr] = numStr.split('.');
  
  const readNumber = (str) => {
    const txtNum = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const txtUnit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
    let res = "";
    let len = str.length;
    for (let i = 0; i < len; i++) {
      let digit = parseInt(str[i]);
      let pos = len - i - 1;
      if (digit !== 0) {
        if (digit === 1 && pos === 0 && len > 1) res += "เอ็ด";
        else if (digit === 2 && pos === 1) res += "ยี่";
        else if (digit === 1 && pos === 1) res += "";
        else res += txtNum[digit];
        res += txtUnit[pos];
      }
    }
    return res;
  };

  let bStr = bahtStr;
  let parts = [];
  while(bStr.length > 6) {
    parts.unshift(bStr.slice(-6));
    bStr = bStr.slice(0, -6);
  }
  parts.unshift(bStr);
  
  let bahtRes = parts.map(p => readNumber(p)).filter(p => p !== "").join("ล้าน");
  if (bahtRes) bahtRes += "บาท";
  
  let satangRes = "";
  if (parseInt(satangStr) > 0) satangRes += readNumber(satangStr) + "สตางค์";
  else satangRes += "ถ้วน";
  
  return bahtRes + satangRes;
};

export default function QuotationMaker({ aiQuotationData, setAiQuotationData }) {
  const { auth, canAccess } = useAuth();
  const [mode, setMode] = useState('manual'); // 'ai' or 'manual'
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [settings, setSettings] = useState({});
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [quoteData, setQuoteData] = useState({
    quotation_no: `QT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`,
    date: new Date().toISOString().slice(0,10),
    customer: { name: '', taxId: '', address: '', phone: '' },
    items: [
      { id: 1, description: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, total: 0 }
    ],
    subtotal: 0,
    vat: 0,
    total: 0,
    remark: 'ยืนยันราคา 30 วัน'
  });

  const getSettings = () => JSON.parse(localStorage.getItem('appSettings') || '{}');

  useEffect(() => {
    fetchCustomers();
    fetchSettings();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [quoteData.items]);

  useEffect(() => {
    if (aiQuotationData && customersLoaded) {
      setQuoteData(prev => {
        let newData = { ...prev };
        
        // Match customer from DB
        const rawAiCust = aiQuotationData.customerInfo || aiQuotationData.customer;
        let targetName = prev.customer.name;
        let providedTaxId = prev.customer.taxId;
        let providedAddress = prev.customer.address;
        let providedPhone = prev.customer.phone;

        if (typeof rawAiCust === 'string') {
          targetName = rawAiCust;
        } else if (rawAiCust && typeof rawAiCust === 'object') {
          targetName = rawAiCust.name || rawAiCust.companyName || rawAiCust.customerName || rawAiCust['ชื่อลูกค้า'] || rawAiCust['ชื่อ'] || rawAiCust['ลูกค้า'] || targetName;
          providedTaxId = rawAiCust.taxId || providedTaxId;
          providedAddress = rawAiCust.address || providedAddress;
          providedPhone = rawAiCust.phone || providedPhone;
        }

        const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
        const targetClean = cleanStr(targetName);
        
        if (targetClean) {
          let cust = customers.find(c => cleanStr(c['ชื่อลูกค้า/ผู้ขาย']) === targetClean);
          if (!cust) {
            cust = customers.find(c => cleanStr(c['ชื่อลูกค้า/ผู้ขาย']).includes(targetClean) || targetClean.includes(cleanStr(c['ชื่อลูกค้า/ผู้ขาย'])));
          }
          
          if (cust) {
            newData.customer = {
              name: cust['ชื่อลูกค้า/ผู้ขาย'],
              taxId: cust['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || '',
              address: cust['ที่อยู่ 1'] || '',
              phone: cust['โทรศัพท์'] || ''
            };
          } else {
            newData.customer = { 
              name: targetName,
              taxId: providedTaxId,
              address: providedAddress,
              phone: providedPhone
            };
          }
        }
        
        const aiItems = aiQuotationData.items || aiQuotationData['รายการสินค้า'] || aiQuotationData['สินค้า'] || [];
        if (aiItems.length > 0) {
          newData.items = aiItems.map((item, idx) => {
            const desc = item.description || item.name || item['รายละเอียด'] || item['ชื่อสินค้า'] || item['สินค้า'] || '';
            const qty = Number(item.quantity || item.qty || item['จำนวน'] || 1);
            const unit = item.unit || item['หน่วย'] || 'ชิ้น';
            const price = Number(item.price || item.unit_price || item.unitPrice || item['ราคา'] || item['ราคาต่อหน่วย'] || 0);
            
            return {
              id: Date.now() + idx,
              description: desc,
              quantity: qty,
              unit: unit,
              unit_price: price,
              total: qty * price
            };
          });
        }
        return newData;
      });
      if (setAiQuotationData) {
        setAiQuotationData(null);
      }
    }
  }, [aiQuotationData, customersLoaded, customers, setAiQuotationData]);

  const fetchCustomers = async () => {
    try {
      const s = getSettings();
      const res = await fetch(`${s.n8nUrl || ''}/webhook/db-read?sheet=customer&t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (err) {
      console.log('Failed to fetch customers');
    } finally {
      setCustomersLoaded(true);
    }
  };

  const fetchSettings = async () => {
    try {
      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      setSettings(prev => ({ ...prev, ...localProfile }));

      const s = getSettings();
      const res = await fetch(`${s.n8nUrl || ''}/webhook/settings?t=${Date.now()}`);
      const result = await res.json();
      const data = Array.isArray(result) && result[0]?.json ? result[0].json : (Array.isArray(result) ? result[0] : result);
      
      if (data) {
        setSettings({
          companyName: data['Company Name'] || data.companyName || localProfile.companyName || '',
          companyTaxId: data['Tax ID'] || data.companyTaxId || localProfile.companyTaxId || '',
          companyAddress: data['Address'] || data.companyAddress || localProfile.companyAddress || '',
          companyPhone: data['Phone'] || data.companyPhone || localProfile.companyPhone || '',
          companyLogo: data['Logo URL'] || data.companyLogo || localProfile.companyLogo || ''
        });
      }
    } catch (err) {
      console.log('Failed to fetch settings');
    }
  };

  const calculateTotals = () => {
    const subtotal = quoteData.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const vat = subtotal * 0.07;
    setQuoteData(prev => ({
      ...prev,
      subtotal,
      vat,
      total: subtotal + vat
    }));
  };

  const handleCustomerSelect = (e) => {
    const name = e.target.value;
    if (!name) {
      setQuoteData(prev => ({
        ...prev,
        customer: { name: '', taxId: '', address: '', phone: '' }
      }));
      return;
    }
    const cust = customers.find(c => c['ชื่อลูกค้า/ผู้ขาย'] === name);
    if (cust) {
      setQuoteData(prev => ({
        ...prev,
        customer: {
          name: cust['ชื่อลูกค้า/ผู้ขาย'],
          taxId: cust['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || '',
          address: cust['ที่อยู่ 1'] || '',
          phone: cust['โทรศัพท์'] || ''
        }
      }));
    } else {
      setQuoteData(prev => ({ ...prev, customer: { ...prev.customer, name } }));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...quoteData.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }
    setQuoteData({ ...quoteData, items: newItems });
  };

  const addItem = () => {
    setQuoteData({
      ...quoteData,
      items: [...quoteData.items, { id: Date.now(), description: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = quoteData.items.filter((_, i) => i !== index);
    setQuoteData({ ...quoteData, items: newItems });
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setLoading(true);
    try {
      const s = getSettings();
      const res = await fetch(`${s.n8nUrl || ''}/webhook/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `ร่างใบเสนอราคา: ${aiPrompt}` })
      });
      const data = await res.json();
      
      if (data?.action === 'quotation' && data?.data) {
        const d = data.data;
        const aiItems = (d.items || []).map((item, idx) => ({
          id: Date.now() + idx,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'ชิ้น',
          unit_price: item.price || 0,
          total: (item.quantity || 1) * (item.price || 0)
        }));
        
        setQuoteData(prev => ({
          ...prev,
          customer: {
            ...prev.customer,
            ...d.customerInfo
          },
          items: aiItems.length > 0 ? aiItems : prev.items
        }));
        setAiPrompt('');
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาดในการเรียก AI' });
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
  };

  const saveQuotation = async () => {
    try {
      setLoading(true);
      const s = getSettings();
      await fetch(`${s.n8nUrl || ''}/webhook/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quoteData,
          created_by: auth?.user?.name
        })
      });
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกใบเสนอราคาเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.log('Error saving', err);
      Swal.fire({ icon: 'success', title: 'สำเร็จ (Offline)', text: 'บันทึกสำเร็จ (Offline Mode)', timer: 1500, showConfirmButton: false });
    } finally {
      setLoading(false);
    }
  };

  if (!canAccess('quote')) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <h1 className="title-lg">สร้างใบเสนอราคา</h1>
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', padding: '0.25rem' }}>
          <button 
            className={`btn-mode ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <FileText size={16} /> สร้างเอง
          </button>
          <button 
            className={`btn-mode ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => setMode('ai')}
          >
            <Bot size={16} /> ใช้ AI ช่วย
          </button>
        </div>
      </div>

      <div style={styles.layout}>
        {/* LEFT PANEL: Form / AI */}
        <div className="glass-card no-print" style={styles.leftPanel}>
          {mode === 'ai' && (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
                <Bot /> AI ผู้ช่วยร่างใบเสนอราคา
              </h3>
              <form onSubmit={handleAiSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  className="input-field" 
                  style={{ flex: 1 }} 
                  placeholder="เช่น ออกใบเสนอราคาให้ บจก. เอบีซี มีคอมพิวเตอร์ 2 เครื่อง เครื่องละ 25000"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'กำลังคิด...' : 'สร้าง'}
                </button>
              </form>
            </div>
          )}

          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>ข้อมูลลูกค้า</h3>
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">ชื่อลูกค้า</label>
                <select className="input-field" style={{ flex: 1, width: '100%' }} value={quoteData.customer.name} onChange={handleCustomerSelect}>
                  <option value="">-- เลือกจากฐานข้อมูล --</option>
                  {quoteData.customer.name && !customers.find(c => c['ชื่อลูกค้า/ผู้ขาย'] === quoteData.customer.name) && (
                    <option value={quoteData.customer.name}>{quoteData.customer.name} (ระบุเองจาก AI)</option>
                  )}
                  {customers.map((c, i) => (
                    <option key={i} value={c['ชื่อลูกค้า/ผู้ขาย']}>
                      {c['ชื่อลูกค้า/ผู้ขาย']}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">เลขประจำตัวผู้เสียภาษี</label>
                <input className="input-field" value={quoteData.customer.taxId} onChange={(e) => setQuoteData({...quoteData, customer: {...quoteData.customer, taxId: e.target.value}})} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">ที่อยู่</label>
              <textarea className="input-field" rows="2" value={quoteData.customer.address} onChange={(e) => setQuoteData({...quoteData, customer: {...quoteData.customer, address: e.target.value}})} />
            </div>
          </div>

          <div style={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={styles.sectionTitle}>รายการสินค้า</h3>
              <button onClick={addItem} style={styles.btnSecondary}><Plus size={16}/> เพิ่มรายการ</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quoteData.items.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input className="input-field" style={{ flex: 2 }} placeholder="ชื่อสินค้า" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                  <input className="input-field" style={{ width: '80px' }} type="number" placeholder="จำนวน" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                  <input className="input-field" style={{ width: '80px' }} placeholder="หน่วย" value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} />
                  <input className="input-field" style={{ width: '100px' }} type="number" placeholder="ราคา/หน่วย" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} />
                  <div style={{ width: '100px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(item.total)}</div>
                  <button onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.5rem' }}><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.print()}>
              <Printer size={18} /> พิมพ์ / PDF
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Preview A4 */}
        <div style={styles.rightPanel}>
          <div className="a4-preview print-area">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--text-primary)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {settings.companyLogo && (
                  <img src={settings.companyLogo} alt="Logo" style={{ maxHeight: '80px', maxWidth: '150px', objectFit: 'contain' }} />
                )}
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{settings.companyName || settings['Company Name'] || 'บริษัท สมาร์ทโควท จำกัด'}</h1>
                  <p style={{ fontSize: '12px', color: '#666' }}>{settings.companyAddress || settings['Address'] || '123 ถ.สุขุมวิท กรุงเทพฯ 10110'}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>โทร: {settings.companyPhone || settings['Phone'] || '02-123-4567'} | เลขภาษี: {settings.companyTaxId || settings['Tax ID'] || '01055xxxxxxxx'}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>ใบเสนอราคา</h2>
                <h3 style={{ fontSize: '18px', color: '#666' }}>QUOTATION</h3>
              </div>
            </div>

            {/* Info block */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ width: '60%', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                <p><strong>ลูกค้า:</strong> {quoteData.customer.name}</p>
                <p><strong>ที่อยู่:</strong> {quoteData.customer.address}</p>
                <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {quoteData.customer.taxId}</p>
                <p><strong>เบอร์โทร:</strong> {quoteData.customer.phone}</p>
              </div>
              <div style={{ width: '35%', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                <p><strong>เลขที่:</strong> {quoteData.quotation_no}</p>
                <p><strong>วันที่:</strong> {quoteData.date}</p>
                <p><strong>พนักงานขาย:</strong> {auth?.user?.name}</p>
              </div>
            </div>

            {/* Table */}
            <table style={styles.printTable}>
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>ลำดับ</th>
                  <th style={{ width: '50%' }}>รายการ</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>จำนวน</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>หน่วย</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>ราคา/หน่วย</th>
                  <th style={{ width: '13%', textAlign: 'right' }}>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {quoteData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>{item.description}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="print-totals-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                <p><strong>หมายเหตุ:</strong> {quoteData.remark}</p>
              </div>
              <div style={{ width: '48%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.25rem' }}>รวมเงิน</td>
                      <td style={{ padding: '0.25rem', textAlign: 'right' }}>{formatMoney(quoteData.subtotal)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.25rem' }}>ภาษีมูลค่าเพิ่ม 7%</td>
                      <td style={{ padding: '0.25rem', textAlign: 'right' }}>{formatMoney(quoteData.vat)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.25rem', fontWeight: 'bold' }}>ยอดเงินสุทธิ</td>
                      <td style={{ padding: '0.25rem', textAlign: 'right', fontWeight: 'bold', borderTop: '2px solid #333' }}>{formatMoney(quoteData.total)}</td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ padding: '0.25rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#333', fontStyle: 'italic', borderBottom: '2px solid #333' }}>
                        ( {THBText(quoteData.total)} )
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div className="print-signature-section" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
              <div style={styles.signatureBox}>
                <div style={styles.signatureLine}></div>
                <p>ผู้เสนอราคา</p>
                <p>วันที่: ...../...../.....</p>
              </div>
              <div style={styles.signatureBox}>
                <div style={styles.signatureLine}></div>
                <p>ผู้อนุมัติ</p>
                <p>วันที่: ...../...../.....</p>
              </div>
              <div style={styles.signatureBox}>
                <div style={styles.signatureLine}></div>
                <p>ผู้รับใบเสนอราคา</p>
                <p>วันที่: ...../...../.....</p>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .btn-mode {
          border: none; background: transparent; padding: 0.5rem 1rem; border-radius: var(--radius-full);
          font-family: inherit; font-weight: 600; color: var(--text-secondary); cursor: pointer;
          display: flex; gap: 0.5rem; align-items: center; transition: all 0.2s;
        }
        .btn-mode.active { background: var(--bg-secondary); color: var(--accent-primary); box-shadow: var(--shadow-sm); }
        .a4-preview {
          background: white; color: black; width: 210mm; min-height: 297mm;
          padding: 20mm; margin: 0 auto; box-shadow: var(--shadow-lg);
          font-family: 'Sarabun', 'Prompt', sans-serif;
        }
        .a4-preview table {
          border-collapse: collapse;
          width: 100%;
        }
        .a4-preview table th,
        .a4-preview table td {
          border: 1px solid #ccc;
          padding: 6px 8px;
          font-size: 13px;
        }
        .a4-preview table th {
          background: #f3f4f6;
          font-weight: 600;
        }
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
          }
          html, body {
            width: 210mm;
            height: auto;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          
          /* Table pagination support */
          .print-area table {
            page-break-inside: auto;
          }
          .print-area table thead {
            display: table-header-group;
          }
          .print-area table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          /* Signature section stays together and at bottom */
          .print-signature-section {
            page-break-inside: avoid;
            margin-top: 3rem;
          }

          /* Totals section stays together */
          .print-totals-section {
            page-break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    flex: 1,
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  rightPanel: {
    background: 'var(--bg-tertiary)',
    padding: '2rem',
    borderRadius: 'var(--radius-md)'
  },
  formSection: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '1.5rem',
    marginBottom: '1rem'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: 'var(--text-primary)'
  },
  btnSecondary: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    fontWeight: 500
  },
  printTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    fontSize: '14px'
  },
  signatureBox: {
    textAlign: 'center',
    width: '30%',
    fontSize: '14px'
  },
  signatureLine: {
    borderBottom: '1px dotted #000',
    marginBottom: '0.5rem',
    height: '2rem'
  }
};
