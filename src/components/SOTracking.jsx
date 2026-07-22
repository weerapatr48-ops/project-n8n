import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, ChevronDown, ChevronUp, PackageCheck, Clock, FileText, Download, Eye } from 'lucide-react';

export default function SOTracking() {
  const { salesSO, subSalesSO } = useData();
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
    return soDetails.filter(d => d.so_id === soId);
  };

  const totalSOs = soHeaders.length;
  const completedSOs = soHeaders.filter(so => so.status === 'จัดส่งเรียบร้อย').length;
  const pendingSOs = totalSOs - completedSOs;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-lg" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PackageCheck size={28} color="var(--accent-primary)" /> ติดตามสถานะใบสั่งขาย (SO)
          </h1>
          <p className="subtitle">ตรวจสอบสถานะการจัดส่งสินค้าของฝ่ายคลังสินค้า</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6' }}>
            <FileText size={32} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>ใบสั่งขายทั้งหมด</p>
            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{totalSOs} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b' }}>
            <Clock size={32} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>รอคลังจัดส่ง</p>
            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{pendingSOs} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--success)' }}>
            <PackageCheck size={32} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>จัดส่งเรียบร้อย</p>
            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{completedSOs} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredSOs.map((so) => {
                const isExpanded = expandedId === so.id;
                const items = getItemsForSO(so.id);
                const isCompleted = so.status === 'จัดส่งเรียบร้อย';

                return (
                  <div key={so.id} style={{ 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}>
                    {/* Header */}
                    <div 
                      style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.02)' : 'transparent', flexWrap: 'wrap', gap: '1rem' }}
                      onClick={() => setExpandedId(isExpanded ? null : so.id)}
                    >
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เลขที่บิล (SO)</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{so.id}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px', flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ลูกค้า</span>
                          <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{so.customer_name}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ยอดรวม</span>
                          <strong style={{ color: 'var(--text-primary)' }}>฿{new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(so.total_amount || 0)}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>วันที่สร้าง</span>
                          <span>{new Date(so.date).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem' }}>
                          {isCompleted ? <PackageCheck size={14} /> : <Clock size={14} />} 
                          {so.status || 'รอจัดส่ง'}
                        </span>
                        {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Details (Expanded) */}
                    {isExpanded && (
                      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>รายการสินค้า:</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table" style={{ marginBottom: '0', minWidth: '600px' }}>
                            <thead>
                              <tr>
                                <th>รหัสสินค้า</th>
                                <th>ชื่อสินค้า</th>
                                <th style={{ textAlign: 'right' }}>ราคา/หน่วย</th>
                                <th style={{ textAlign: 'right' }}>จำนวน</th>
                                <th>หน่วย</th>
                                <th style={{ textAlign: 'right' }}>รวม</th>
                              </tr>
                            </thead>
                          <tbody>
                            {items.length > 0 ? items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.product_code || '-'}</td>
                                <td>{item.product_name}</td>
                                <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat('th-TH').format(item.price || 0)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.quantity}</td>
                                <td>{item.unit}</td>
                                <td style={{ textAlign: 'right' }}>{new Intl.NumberFormat('th-TH').format(item.total || 0)}</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
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
