import React, { useState, useEffect } from 'react';
import { History, RefreshCw, FileText, Download, BarChart2 } from 'lucide-react';

const getN8nUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return settings.n8nUrl || '';
  } catch {
    return '';
  }
};

export default function QuotationHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // เรียก API n8n Webhook เพื่อดึงข้อมูลประวัติ (ต้องไปสร้าง Webhook ฝั่ง n8n มารับ)
      const response = await fetch(`${getN8nUrl()}/webhook/quotations-history`, { method: 'GET' });
      if (response.ok) {
        const result = await response.json();
        let rawData = [];
        if (Array.isArray(result) && result[0]?.json) rawData = result.map(item => item.json);
        else if (Array.isArray(result)) rawData = result;
        else if (result && Array.isArray(result.data)) rawData = result.data;
        
        rawData.sort((a, b) => {
          const idA = String(a.id || a['เลขที่'] || a['เลขที่ใบเสนอราคา'] || a['รหัส'] || '');
          const idB = String(b.id || b['เลขที่'] || b['เลขที่ใบเสนอราคา'] || b['รหัส'] || '');
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        setData(rawData);
      } else {
        throw new Error('API Error');
      }
    } catch (error) {
      console.log('Failed to fetch from n8n, loading dummy data for preview');
      // ใส่ข้อมูลจำลองให้ดูเป็นตัวอย่างเผื่อฝั่ง n8n ยังทำ API ไม่เสร็จ
      setData([
        { id: 'QT-2023-001', date: '2023-10-01', customer: 'บริษัท เอ.อี.เอส จำกัด', total: 150000, status: 'Completed' },
        { id: 'QT-2023-002', date: '2023-10-02', customer: 'บริษัท เทสต์สเตป จำกัด', total: 45000, status: 'Draft' },
        { id: 'QT-2023-003', date: '2023-10-05', customer: 'บริษัท สมมติ จำกัด', total: 250000, status: 'Completed' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const totalQuotations = data.length;
  const totalValue = data.reduce((sum, item) => sum + (Number(item.total || item['ยอดรวมสุทธิ'] || 0)), 0);

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-lg" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>ประวัติใบเสนอราคา</h1>
          <p className="subtitle">รายการใบเสนอราคาที่เคยสร้างไว้ทั้งหมด</p>
        </div>
        <button className="btn-primary" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={fetchHistory} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'pulse' : ''} /> รีเฟรชข้อมูล
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem', gap: '1.5rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6' }}>
            <FileText size={32} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>จำนวนใบเสนอราคาทั้งหมด</p>
            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>{totalQuotations} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>รายการ</span></h2>
          </div>
        </div>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--success)' }}>
            <BarChart2 size={32} />
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>มูลค่ารวมทั้งหมด</p>
            <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--text-primary)' }}>
              {new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2 }).format(totalValue)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>บาท</span>
            </h2>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>เลขที่เอกสาร</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>วันที่</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>ลูกค้า</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>ยอดรวมสุทธิ</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>สถานะ</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{row.id || row['เลขที่เอกสาร']}</td>
                  <td style={{ padding: '1rem' }}>{row.date || row['วันที่']}</td>
                  <td style={{ padding: '1rem' }}>{row.customer || row['ลูกค้า']}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2 }).format(row.total || row['ยอดรวมสุทธิ'] || 0)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: (row.status || row['สถานะ']) === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: (row.status || row['สถานะ']) === 'Completed' ? 'var(--success)' : '#f59e0b'
                    }}>
                      {row.status || row['สถานะ'] || 'Draft'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: '10px' }} title="ดูรายละเอียด">
                      <FileText size={18} />
                    </button>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="ดาวน์โหลด">
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ไม่มีข้อมูลใบเสนอราคา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
