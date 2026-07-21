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

export default function QuotationHistory({ setCurrentTab, setAiQuotationData }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getN8nUrl()}/webhook/quotations-history`, { method: 'GET' });
      if (!response.ok) throw new Error('API Error');
      
      const result = await response.json();
      let rawData = [];
      if (Array.isArray(result) && result[0]?.json) rawData = result.map(item => item.json);
      else if (Array.isArray(result)) rawData = result;
      else if (result && Array.isArray(result.data)) rawData = result.data;
      
      let mergedData = [];
      for (const item of rawData) {
        const id = item.quotation_no || item.id || item['เลขที่'] || item['เลขที่เอกสาร'] || item['รหัส'];
        if (id) {
          mergedData.push({
             ...item,
             id: id,
             customer: item.customer_name || item.customer || item['ลูกค้า'] || '-',
             total: item.total || item['ยอดรวมสุทธิ'] || 0,
             status: item.status || item['สถานะ'] || 'Pending',
             date: item.date || item['วันที่'],
             items_json: item.items_json,
             rawItem: item
          });
        }
      }

      mergedData.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
      
      setData(mergedData);
    } catch (error) {
      console.log('Failed to fetch from n8n', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const totalQuotations = data.length;
  const totalValue = data.reduce((sum, item) => sum + (Number(item.total || item['ยอดรวมสุทธิ'] || 0)), 0);

  const handleEdit = (row) => {
    let items = [];
    try {
      if (row.items_json) {
        items = JSON.parse(row.items_json);
      }
    } catch(e) {
      console.error('Failed to parse items_json', e);
    }
    
    if (setAiQuotationData && setCurrentTab) {
      setAiQuotationData({
        quotation_no: row.id || row['เลขที่เอกสาร'],
        customerInfo: { name: row.customer },
        items: items
      });
      setCurrentTab('quote_maker');
    }
  };

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
                    {new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(row.total || row['ยอดรวมสุทธิ'] || 0)}
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
                      {row.status || row['สถานะ'] || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: '10px' }} title="ดูรายละเอียด">
                      <FileText size={18} />
                    </button>
                    <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="ดาวน์โหลด">
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
