import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, Plus, Search, Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export default function StockManager() {
  const { canAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'log'
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stockForm, setStockForm] = useState({
    productName: '',
    type: 'add',
    amount: 1,
    unit: 'ชิ้น',
    remark: ''
  });

  const getSettings = () => JSON.parse(localStorage.getItem('appSettings') || '{}');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const s = getSettings();

      
      let res = await fetch(`${s.n8nUrl || ''}/webhook/db-read?sheet=product&t=${Date.now()}`);
      if (!res.ok) {
        res = await fetch(`${s.n8nUrl || ''}/webhook/db-read?sheet=stock&t=${Date.now()}`);
      }

      if (res.ok) {
        const text = await res.text();
        let result = [];
        try {
          if (text && text.trim()) result = JSON.parse(text);
        } catch (e) {
          console.warn('Response is not valid JSON:', text);
        }
        let rawData = [];
        if (Array.isArray(result) && result[0]?.json) rawData = result.map(item => item.json);
        else if (Array.isArray(result)) rawData = result;
        else if (result && Array.isArray(result.data)) rawData = result.data;
        else if (typeof result === 'object' && result !== null && !result.error) rawData = [result];
        
        if (rawData.length > 0) {
          const mappedProducts = rawData.map(row => ({
            'รหัส': row['รหัส'] || row['รหัสสินค้า'] || row['ProductID'] || row.id || '-',
            'ชื่อ': row['ชื่อ'] || row['ชื่อสินค้า'] || row['ProductName'] || row.name || '-',
            'หน่วย': row['หน่วย'] || row['Unit'] || row.unit || 'ชิ้น',
            'คงเหลือ': row['คงเหลือ'] || row['จำนวน'] || row['ยอดคงเหลือ'] || row['Qty'] || row['Quantity'] || row['จำนวนคงเหลือ'] || 0,
            'สถานะ': row['สถานะ'] || row['Status'] || row.status || 'Active'
          })).filter(row => row['ชื่อ'] && row['ชื่อ'] !== '-');
          
          mappedProducts.sort((a, b) => String(a['รหัส'] || '').localeCompare(String(b['รหัส'] || ''), undefined, { numeric: true, sensitivity: 'base' }));
          
          setProducts(mappedProducts);
          return;
        }
      }
      throw new Error('No data returned');
    } catch (err) {
      console.log('Failed to fetch stock/product', err);
      // Mock data for display
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockForm.productName) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกสินค้า' });
      return;
    }
    
    setLoading(true);
    try {
      const s = getSettings();
      const prompt = `${stockForm.type === 'add' ? 'เพิ่ม' : 'ตัด'}สต็อก ${stockForm.productName} ${stockForm.amount} ${stockForm.unit}`;
      
      const res = await fetch(`${s.n8nUrl || ''}/webhook/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      await res.json();
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกสต็อกเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
      setStockForm({ ...stockForm, amount: 1, remark: '' });
      fetchProducts(); // Refresh list
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาดในการบันทึกสต็อก' });
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => new Intl.NumberFormat('th-TH').format(amount);

  const filteredProducts = products.filter(p => 
    (p['ชื่อ'] || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p['รหัส'] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canAccess('stock')) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="title-lg">จัดการสต็อกสินค้า</h1>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: 0 }}>
        
        {/* Tabs Header */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <button 
            style={{ ...styles.tabBtn, ...(activeTab === 'list' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('list')}
          >
            <Package size={18} /> รายการสินค้า
          </button>
          <button 
            style={{ ...styles.tabBtn, ...(activeTab === 'log' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('log')}
          >
            <RefreshCw size={18} /> บันทึกการเคลื่อนไหว (Stock Log)
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          
          {activeTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div className="input-wrapper" style={{ width: '300px', position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    className="input-field" 
                    style={{ width: '100%', paddingLeft: '2.5rem' }} 
                    placeholder="ค้นหารหัส หรือชื่อสินค้า..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="btn-primary" onClick={fetchProducts} disabled={loading}>
                  <RefreshCw size={16} className={loading ? 'pulse' : ''} /> รีเฟรช
                </button>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>รหัสสินค้า</th>
                      <th>ชื่อสินค้า</th>
                      <th style={{ textAlign: 'right' }}>จำนวนคงเหลือ</th>
                      <th>หน่วย</th>
                      <th style={{ textAlign: 'right' }}>ราคาขาย</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{p['รหัส']}</td>
                        <td>{p['ชื่อ']}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: p['คงเหลือ'] <= 5 ? 'var(--danger-color)' : 'inherit' }}>
                          {formatMoney(p['คงเหลือ'] || 0)}
                        </td>
                        <td>{p['หน่วย']}</td>
                        <td style={{ textAlign: 'right' }}>{formatMoney(p['ราคาขาย'] || 0)}</td>
                        <td>
                          {p['สถานะ'] === 'Active' ? 
                            <span className="badge badge-success">Active</span> : 
                            <span className="badge badge-warning">{p['สถานะ'] || 'N/A'}</span>
                          }
                        </td>
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && !loading && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>ไม่มีข้อมูลสินค้าในระบบ</div>
                          <button className="btn-primary" onClick={() => setActiveTab('log')} style={{ margin: '0 auto' }}>
                            <Plus size={16} /> ไปที่หน้าบันทึกเข้า/ออกสต็อกเพื่อเพิ่มข้อมูล
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="grid-2" style={{ gap: '2rem' }}>
              
              {/* Form Side */}
              <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>บันทึกเข้า/ออกสต็อก</h3>
                <form onSubmit={handleStockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div className="input-group">
                    <label className="input-label">เลือกสินค้า</label>
                    <input 
                      className="input-field" 
                      list="product-list" 
                      required
                      placeholder="พิมพ์เพื่อค้นหาสินค้า..."
                      value={stockForm.productName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const prod = products.find(p => p['ชื่อ'] === val);
                        setStockForm({ ...stockForm, productName: val, unit: prod ? prod['หน่วย'] : stockForm.unit });
                      }}
                    />
                    <datalist id="product-list">
                      {products.map((p, i) => <option key={i} value={p['ชื่อ']} />)}
                    </datalist>
                  </div>

                  <div className="input-group">
                    <label className="input-label">ประเภทรายการ</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="type" value="add" checked={stockForm.type === 'add'} onChange={() => setStockForm({...stockForm, type: 'add'})} />
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>เพิ่มเข้าสต็อก (+)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="type" value="deduct" checked={stockForm.type === 'deduct'} onChange={() => setStockForm({...stockForm, type: 'deduct'})} />
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>ตัดออกจากสต็อก (-)</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="input-label">จำนวน</label>
                      <input type="number" className="input-field" min="1" required value={stockForm.amount} onChange={(e) => setStockForm({...stockForm, amount: e.target.value})} />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="input-label">หน่วย</label>
                      <input className="input-field" required value={stockForm.unit} onChange={(e) => setStockForm({...stockForm, unit: e.target.value})} />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }} disabled={loading}>
                    {loading ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                  </button>
                </form>
              </div>

              {/* Log Side (Placeholder for now until n8n webhook is ready) */}
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20}/> ประวัติล่าสุด
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    ไม่มีประวัติการทำรายการล่าสุด
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  tabBtn: {
    padding: '1rem 1.5rem',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: 'var(--accent-primary)',
    borderBottom: '2px solid var(--accent-primary)',
    background: 'var(--bg-secondary)'
  }
};
