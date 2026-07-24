import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData, GAS_URL } from '../context/DataContext';
import { FileText, Bot, Plus, Trash2, Printer, Save, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { THBText, formatMoney } from '../utils/formatters';
import QuotationPrintPreview from './QuotationPrintPreview';
export default function QuotationMaker({ aiQuotationData, setAiQuotationData }) {
  const { auth, canAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const { customers, employees, products: rawProducts, stockData, settings, isDataLoaded } = useData();
  
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

  useEffect(() => {
    calculateTotals();
  }, [quoteData.items]);


  const saveQuotation = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      
      const docId = quoteData.quotation_no;
      const timestamp = new Date().toISOString();
      const creator = auth?.user?.name || 'System';
      
      // 1. Create Sales PR Header
      await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'insert',
          sheet: 'sales_pr_header',
          data: {
            id: docId,
            customer_name: quoteData.customer?.name || quoteData.customerName || '-',
            tax_id: quoteData.customer?.taxId || '',
            address: quoteData.customer?.address || '',
            phone: quoteData.customer?.phone || '',
            total_amount: quoteData.total || 0,
            status: 'เสนอราคา',
            created_by: creator,
            created_at: timestamp,
            updated_at: timestamp
          }
        })
      });

      // 2. Create Sales PR Body (Items)
      for (const item of quoteData.items) {
        await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'insert',
            sheet: 'sales_pr_body',
            data: {
              id: `PR-BODY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              doc_id: docId,
              product_name: item.description,
              product_code: item.code || '',
              quantity: Number(item.quantity) || 0,
              unit: item.unit || 'ชิ้น',
              price: Number(item.unit_price) || 0,
              total: Number(item.total) || 0,
              created_by: creator,
              created_at: timestamp
            }
          })
        });
      }
      
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกใบเสนอราคาเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.log('Error saving ', err);
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' });
    } finally {
      setLoading(false);
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
      </div>

      <div style={styles.layout}>
        {/* LEFT PANEL: Form */}
        <div className="glass-card no-print" style={styles.leftPanel}>

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
              <Save size={18} /> {loading ? 'กำลังบันทึก...' : 'บันทึกใบเสนอราคา (PR Header & Body)'}
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
