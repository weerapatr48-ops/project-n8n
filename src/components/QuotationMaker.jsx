import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { FileText, Bot, Plus, Trash2, Printer, Save, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { THBText, formatMoney } from '../utils/formatters';
import QuotationPrintPreview from './QuotationPrintPreview';
export default function QuotationMaker({ aiQuotationData, setAiQuotationData }) {
  const { auth, canAccess } = useAuth();
  const [mode, setMode] = useState('manual'); // 'ai' or 'manual'
  const [loading, setLoading] = useState(false);
  const { customers, employees, products: rawProducts, stockData, settings, isDataLoaded } = useData();
  const [aiPrompt, setAiPrompt] = useState('');
  
  const productsList = React.useMemo(() => {
    if (!rawProducts) return [];
    let arr = [];
    if (Array.isArray(rawProducts) && rawProducts.length > 0 && rawProducts[0]?.json) {
      arr = rawProducts.map(item => item.json);
    } else if (Array.isArray(rawProducts)) {
      arr = rawProducts;
    }
    return arr.map(row => ({
      name: row['ชื่อ'] || row['ชื่อสินค้า'] || row['ProductName'] || row.name || '-',
      code: row['รหัส'] || row['รหัสสินค้า'] || row['ProductID'] || row.id || '-',
      unit: row['หน่วย'] || row['Unit'] || row.unit || 'ชิ้น',
      price: row['ราคาขาย'] || row['ราคา'] || row['Price'] || row['unit_price'] || 0
    })).filter(p => p.name !== '-');
  }, [rawProducts]);
  
  const [quoteData, setQuoteData] = useState({
    quotation_no: `QT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`,
    date: new Date().toISOString().slice(0,10),
    customer: { name: '', taxId: '', address: '', phone: '' },
    employee: { name: auth?.user?.name || '' },
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
    calculateTotals();
  }, [quoteData.items]);

  useEffect(() => {
    if (aiQuotationData && isDataLoaded) {
      setQuoteData(prev => {
        let newData = { ...prev };
        
        if (aiQuotationData.quotation_no || aiQuotationData.id) {
          newData.quotation_no = aiQuotationData.quotation_no || aiQuotationData.id;
        }
        
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

        const cleanStr = (s) => {
          let str = (s || '').toLowerCase();
          str = str.replace(/บริษัท|บ\.|บมจ\.?|บจก\.?|จำกัด|หจก\.?|co\.,?\s*ltd\.?|ltd\.?|company|limited|partnership|head office/g, '');
          return str.replace(/[^a-z0-9ก-๙]/g, '');
        };
        const targetClean = cleanStr(targetName);
        
        if (targetClean) {
          let cust = customers.find(c => cleanStr(c['ชื่อลูกค้า/ผู้ขาย']) === targetClean);
          if (!cust) {
            cust = customers.find(c => cleanStr(c['ชื่อลูกค้า/ผู้ขาย']).includes(targetClean) || targetClean.includes(cleanStr(c['ชื่อลูกค้า/ผู้ขาย'])));
          }
          if (!cust) {
            // Additional fallback checking "ชื่อบริษัท (เพิ่มเติม)"
            cust = customers.find(c => {
              const extra = cleanStr(c['ชื่อบริษัท (เพิ่มเติม)']);
              return extra && (extra === targetClean || extra.includes(targetClean) || targetClean.includes(extra));
            });
          }
          
          if (cust) {
            newData.customer = {
              name: cust['ชื่อลูกค้า/ผู้ขาย'],
              taxId: cust['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || '',
              address: cust['ที่อยู่ 1'] || '',
              phone: cust['โทรศัพท์'] || ''
            };
            
            // Auto-select salesperson based on รหัส PIC
            if (isDataLoaded && employees.length > 0) {
              const picCode = (cust['รหัส PIC'] || cust['รหัสPIC'] || cust['PIC'] || '').trim();
              if (picCode) {
                const emp = employees.find(e => (e['รหัสpic'] || e['รหัสPIC'] || e['PIC'] || '').trim() === picCode);
                if (emp) {
                  const empName = emp['ชื่อpic'] || emp['ชื่อพนักงาน'] || emp['ชื่อ'] || emp['name'] || emp['ชื่อ-นามสกุล'];
                  if (empName) newData.employee = { ...newData.employee, name: empName };
                }
              }
            }
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
  }, [aiQuotationData, isDataLoaded, customers, employees, setAiQuotationData]);



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
      setQuoteData(prev => {
        let newData = {
          ...prev,
          customer: {
            name: cust['ชื่อลูกค้า/ผู้ขาย'],
            taxId: cust['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || '',
            address: cust['ที่อยู่ 1'] || '',
            phone: cust['โทรศัพท์'] || ''
          }
        };

        if (isDataLoaded && employees.length > 0) {
          const picCode = (cust['รหัส PIC'] || cust['รหัสPIC'] || cust['PIC'] || '').trim();
          if (picCode) {
            const emp = employees.find(e => (e['รหัสpic'] || e['รหัสPIC'] || e['PIC'] || '').trim() === picCode);
            if (emp) {
              const empName = emp['ชื่อpic'] || emp['ชื่อพนักงาน'] || emp['ชื่อ'] || emp['name'] || emp['ชื่อ-นามสกุล'];
              if (empName) newData.employee = { ...newData.employee, name: empName };
            }
          }
        }
        return newData;
      });
    } else {
      setQuoteData(prev => ({ ...prev, customer: { ...prev.customer, name } }));
    }
  };

  const handleEmployeeSelect = (e) => {
    const name = e.target.value;
    setQuoteData(prev => ({ ...prev, employee: { ...prev.employee, name } }));
  };

  const handlePrint = () => {
    if (!quoteData.employee?.name) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกพนักงานขาย',
        text: 'โปรดเลือกพนักงานขายจากฐานข้อมูลก่อนทำการพิมพ์ใบเสนอราคา',
        confirmButtonColor: 'var(--accent-primary)',
        confirmButtonText: 'ตกลง'
      });
      return;
    }
    window.print();
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


  const saveQuotation = async () => {
    try {
      setLoading(true);
      const s = getSettings();
      
      const newQuote = { 
        ...quoteData, 
        id: quoteData.quotation_no,
        customerName: quoteData.customer?.name || '-',
        totalAmount: quoteData.total || 0,
        status: 'เสนอราคา',
        created_by: auth?.user?.name,
        saved_at: new Date().toISOString()
      };
      
      const response = await fetch(`${s.n8nUrl || ''}/webhook/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote)
      });
      
      if (!response.ok) throw new Error('Network error');
      
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกใบเสนอราคาไปยังส่วนกลางเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.log('Error saving ');
    }
  };

  const validateForm = () => {
    if (!quoteData.customer?.name && !quoteData.customerName) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อลูกค้า', 'warning');
      return false;
    }
    if (!quoteData.items || quoteData.items.length === 0 || !quoteData.items[0].description) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ', 'warning');
      return false;
    }
    return true;
  };

  const handleCloseSale = async () => {
    if (!validateForm()) return;
    
    const result = await Swal.fire({
      title: 'ยืนยันการปิดการขาย',
      text: 'ระบบจะสร้างใบสั่งขาย (SO) และส่งรายการไปที่คลังสินค้าเพื่อเตรียมจัดส่ง',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน & สร้าง SO',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--success)'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const s = getSettings();
        const n8nUrl = s.n8nUrl || '';
        
        const soNumber = `SO-${Date.now()}`;
        
        // 1. Create SO Header (sales_so)
        await fetch(`${n8nUrl}/webhook/db-write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'insert',
            sheet: 'sales_so',
            data: {
              id: soNumber,
              customer_name: quoteData.customerName,
              total_amount: quoteData.grandTotal,
              date: new Date().toISOString(),
              status: 'รอจัดส่ง', // Pending
              created_by: auth?.user?.name || 'System',
              payment_term: quoteData.paymentTerm || '',
              valid_until: quoteData.validUntil || ''
            }
          })
        });

        // 2. Create SO Details (sub_sales_so)
        for (const item of quoteData.items) {
          await fetch(`${n8nUrl}/webhook/db-write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              sheet: 'sub_sales_so',
              data: {
                id: `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                so_id: soNumber,
                product_name: item.description,
                product_code: item.code || '',
                quantity: Number(item.quantity) || 0,
                unit: item.unit || 'ชิ้น',
                price: Number(item.unitPrice) || 0,
                total: Number(item.total) || 0
              }
            })
          });
        }
        const newQuote = { 
          ...quoteData, 
          id: quoteData.quotation_no,
          customerName: quoteData.customer?.name || '-',
          totalAmount: quoteData.total || 0,
          status: 'รอคลังจัดส่ง (SO)',
          created_by: auth?.user?.name,
          saved_at: new Date().toISOString(),
          remark: `${quoteData.remark} (อ้างอิง: ${soNumber})`
        };
        
        await fetch(`${n8nUrl}/webhook/quotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newQuote)
        }).catch(e => console.log("Failed to save quotation", e));
        
        Swal.fire({
          title: 'สำเร็จ!',
          text: `สร้างใบสั่งขาย ${soNumber} เรียบร้อย! ส่งต่อให้คลังสินค้าเตรียมจัดส่งแล้ว`,
          icon: 'success'
        });
        
        setQuoteData({
          customerName: '', address: '', taxId: '', date: new Date().toISOString().split('T')[0],
          validUntil: '', paymentTerm: '', items: [{ code: '', description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, total: 0 }],
          notes: '', subTotal: 0, taxAmount: 0, grandTotal: 0,
          customer: {}
        });
        
      } catch (err) {
        console.error("Error creating SO", err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!canAccess('quote')) return null;

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(quoteData.items.length / ITEMS_PER_PAGE));
  const paginatedItems = Array.from({ length: totalPages }, (_, i) => 
    quoteData.items.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE)
  );

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
            <h3 style={styles.sectionTitle}>ข้อมูลพนักงานขาย</h3>
            <div className="input-group">
              <label className="input-label">พนักงานขาย</label>
              <select className="input-field" style={{ width: '100%' }} value={quoteData.employee?.name || ''} onChange={handleEmployeeSelect}>
                <option value="">-- เลือกจากฐานข้อมูล --</option>
                {quoteData.employee?.name && !employees.find(e => (e['ชื่อpic'] || e['ชื่อพนักงาน'] || e['ชื่อ'] || e['name'] || e['ชื่อ-นามสกุล']) === quoteData.employee.name) && (
                  <option value={quoteData.employee.name}>{quoteData.employee.name} (ค่าเริ่มต้น)</option>
                )}
                {employees.map((e, i) => {
                  const empName = e['ชื่อpic'] || e['ชื่อพนักงาน'] || e['ชื่อ'] || e['name'] || e['ชื่อ-นามสกุล'] || 'ไม่ระบุชื่อ';
                  return (
                    <option key={i} value={empName}>
                      {empName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div style={styles.formSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={styles.sectionTitle}>รายการสินค้า</h3>
              <button onClick={addItem} style={styles.btnSecondary}><Plus size={16}/> เพิ่มรายการ</button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0 0.5rem 0.5rem 0', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1 }}>ชื่อสินค้า</div>
              <div style={{ width: '80px', textAlign: 'center' }}>จำนวน</div>
              <div style={{ width: '80px', textAlign: 'center' }}>หน่วย</div>
              <div style={{ width: '100px', textAlign: 'right' }}>ราคา/หน่วย</div>
              <div style={{ width: '100px', textAlign: 'right' }}>รวมเงิน</div>
              <div style={{ width: '34px' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {quoteData.items.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select 
                    className="input-field" 
                    style={{ flex: 1, width: '100%' }} 
                    value={item.description} 
                    onChange={(e) => {
                      const val = e.target.value;
                      updateItem(index, 'description', val);
                      const found = productsList.find(p => p.name === val);
                      if (found) {
                        updateItem(index, 'code', found.code);
                        updateItem(index, 'unit_price', found.price);
                        updateItem(index, 'unit', found.unit);
                      }
                    }} 
                  >
                    <option value="">-- เลือกสินค้า --</option>
                    {item.description && !productsList.find(p => p.name === item.description) && (
                      <option value={item.description}>{item.description} (ระบุเอง)</option>
                    )}
                    {productsList.map((p, i) => (
                      <option key={i} value={p.name}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
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
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={handlePrint}>
              <Printer size={18} /> พิมพ์ / PDF
            </button>
            <button 
              className="btn-primary" 
              style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)' }} 
              onClick={saveQuotation}
              disabled={loading || !quoteData.customer || quoteData.items.length === 0}
            >
              <Save size={18} /> {loading ? 'กำลังบันทึก...' : 'บันทึกใบเสนอราคา'}
            </button>
            <button 
              className="btn-primary" 
              style={{ flex: 1.2, justifyContent: 'center', backgroundColor: '#10b981', color: 'white', border: 'none' }} 
              onClick={handleCloseSale}
              disabled={loading || !quoteData.customer || quoteData.items.length === 0}
            >
              <CheckCircle size={18} /> ปิดการขาย & สร้างใบสั่งขาย (SO)
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Preview A4 */}
        <QuotationPrintPreview 
          quoteData={quoteData}
          settings={settings}
          paginatedItems={paginatedItems}
          totalPages={totalPages}
        />
      </div>
      

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
  }
};
