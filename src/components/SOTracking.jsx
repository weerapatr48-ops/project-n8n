import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, ChevronDown, ChevronUp, PackageCheck, Clock, FileText, Download, Eye } from 'lucide-react';

export default function SOTracking() {
  const { salesSO, subSalesSO, products: masterProducts } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Normalize data
  let soHeaders = [];
  if (Array.isArray(salesSO) && salesSO.length > 0 && salesSO[0]?.json) {
    soHeaders = salesSO.map(s => s.json);
  } else if (Array.isArray(salesSO)) {
    soHeaders = salesSO;
  }

  let soDetails = [];
  if (Array.isArray(subSalesSO) && subSalesSO.length > 0 && subSalesSO[0]?.json) {
    soDetails = subSalesSO.map(s => s.json);
  } else if (Array.isArray(subSalesSO)) {
    soDetails = subSalesSO;
  }

  // Sort by date (newest first)
  const sortedSOs = [...soHeaders].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredSOs = sortedSOs.filter(so => 
    (so.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (so.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemsForSO = (soId) => {
    return soDetails.filter(d => d.so_id === soId).map(item => {
      let code = item.product_code;
      if (!code || code === '-') {
        const found = masterProducts.find(p => (p['ชื่อ'] || p['ชื่อสินค้า'] || p.name) === item.product_name);
        if (found) {
          code = found['รหัส'] || found['รหัสสินค้า'] || found.code || '-';
        }
      }
      return { ...item, product_code: code };
    });
  };

  const totalSOs = soHeaders.length;
  const completedSOs = soHeaders.filter(so => so.status === 'จัดส่งเรียบร้อย').length;
  const pendingSOs = totalSOs - completedSOs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-lg" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PackageCheck size={28} color="var(--accent-primary)" /> ติดตามสถานะใบสั่งขาย (SO)
          </h1>
          <p className="subtitle">ตรวจสอบสถานะการจัดส่งสินค้าของฝ่ายคลังสินค้า</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '1rem', gap: '1rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6' }}>
            <FileText size={28} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>ใบสั่งขายทั้งหมด</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-primary)' }}>{totalSOs} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b' }}>
            <Clock size={28} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>รอคลังจัดส่ง</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-primary)' }}>{pendingSOs} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--success)' }}>
            <PackageCheck size={28} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>จัดส่งเรียบร้อย</p>
            <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-primary)' }}>{completedSOs} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="input-wrapper" style={{ width: '350px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="input-field" 
              style={{ width: '100%', paddingLeft: '2.5rem' }} 
              placeholder="ค้นหาเลขที่ SO หรือชื่อลูกค้า..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {filteredSOs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>ไม่พบข้อมูลใบสั่งขาย</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              {filteredSOs.map((so) => {
                const isExpanded = expandedId === so.id;
                const items = getItemsForSO(so.id);
                const isCompleted = so.status === 'จัดส่งเรียบร้อย';

                return (
                  <div key={so.id} style={{ 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}>
                    {/* Card Content */}
                    <div 
                      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'transparent' }}
                      onClick={() => setExpandedId(isExpanded ? null : so.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เลขที่บิล (SO)</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{so.id}</div>
                        </div>
                        <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem' }}>
                          {isCompleted ? <PackageCheck size={14} /> : <Clock size={14} />} 
                          {so.status || 'รอจัดส่ง'}
                        </span>
                      </div>
                      
                      <div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ลูกค้า</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{so.customer_name}</div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                        <div>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ยอดรวม</span>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>฿{new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(so.total_amount || 0)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>วันที่สร้าง</span>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{new Date(so.date).toLocaleDateString('th-TH')}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {/* Details (Expanded) */}
                    {isExpanded && (
                      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                        <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>รายการสินค้า:</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table" style={{ marginBottom: '0', minWidth: '400px', fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>รหัสสินค้า</th>
                                <th>ชื่อสินค้า</th>
                                <th style={{ textAlign: 'right' }}>จำนวน</th>
                              </tr>
                            </thead>
                          <tbody>
                            {items.length > 0 ? items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.product_code || '-'}</td>
                                <td style={{ whiteSpace: 'normal', minWidth: '150px' }}>{item.product_name}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.quantity} {item.unit}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                                  ไม่พบข้อมูลรายการสินค้า
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
