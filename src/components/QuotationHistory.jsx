import React, { useState, useEffect } from 'react';
import { History, RefreshCw, FileText, Download, BarChart2, Eye, Ban, X, Printer } from 'lucide-react';
import Swal from 'sweetalert2';
import QuotationPrintPreview from './QuotationPrintPreview';

const getN8nUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return settings.ฐานข้อมูลUrl || '';
  } catch {
    return '';
  }
};

import { useData } from '../context/DataContext';

export default function QuotationHistory({ setCurrentTab, setAiQuotationData }) {
  const { salesPRHeader, salesPRBody, refreshData } = useData();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const getSettings = () => {
    try {
      return JSON.parse(localStorage.getItem('appSettings') || '{}');
    } catch {
      return {};
    }
  };

  useEffect(() => {
    setIsLoading(true);
    try {
      if (!salesPRHeader) return;
      
      let mergedData = [];
      for (const header of salesPRHeader) {
        const id = header.id || header['เลขที่เอกสาร'] || header['รหัส'];
        if (id) {
          // Find items for this header
          const items = salesPRBody ? salesPRBody.filter(b => b.doc_id === id || b['Doc ID'] === id) : [];
          const formattedItems = items.map(item => ({
            id: item.id,
            description: item.product_name || item['Product Name'],
            code: item.product_code || item['Product Code'],
            quantity: item.quantity || item['Quantity'],
            unit: item.unit || item['Unit'],
            unit_price: item.price || item['Price'],
            total: item.total || item['Total']
          }));

          mergedData.push({
             id: id,
             customer: header.customer_name || header['Customer Name'] || '-',
             total: header.total_amount || header['Total Amount'] || 0,
             status: header.status || header['Status'] || 'เสนอราคา',
             date: header.created_at || header['Created At'],
             items: formattedItems,
             rawItem: header
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
      console.log('Failed to format PR data', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [salesPRHeader, salesPRBody]);

  const totalQuotations = data.length;
  const totalValue = data.reduce((sum, item) => {
    if ((item.status || item['สถานะ']) === 'Cancelled') return sum;
    return sum + (Number(item.total || item['ยอดรวมสุทธิ'] || 0));
  }, 0);

  const handleEdit = (row) => {
    if (setAiQuotationData && setCurrentTab) {
      setAiQuotationData({
        quotation_no: row.id,
        customerInfo: { name: row.customer },
        items: row.items
      });
      setCurrentTab('quote_maker');
    }
  };

  const handlePreview = (row) => {
    
    const qData = {
      quotation_no: row.id || row['เลขที่เอกสาร'],
      date: row.date || row['วันที่'],
      customer: { 
        name: row.customer || row['ลูกค้า'], 
        address: row.rawItem?.['ที่อยู่'] || row.rawItem?.address || '',
        taxId: row.rawItem?.['เลขผู้เสียภาษี'] || row.rawItem?.taxId || '',
        phone: row.rawItem?.['เบอร์โทร'] || row.rawItem?.phone || ''
      },
      employee: { name: row.rawItem?.['created_by'] || row.rawItem?.['Created By'] || '' },
      items: row.items,
      subtotal: row.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0),
      vat: row.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0) * 0.07,
      total: row.total || 0,
      remark: 'ยืนยันราคา 30 วัน'
    };
    setPreviewData(qData);
  };

  const handleDownload = (row) => {
    handlePreview(row);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleCancel = async (row) => {
    if ((row.status || row['สถานะ']) === 'Cancelled') return;
    
    const result = await Swal.fire({
      title: 'ยกเลิกเอกสาร',
      text: `คุณต้องการยกเลิกใบเสนอราคา ${row.id || row['เลขที่เอกสาร']} ใช่หรือไม่? (เอกสารจะยังคงอยู่ในระบบแต่สถานะจะเป็นยกเลิก)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: 'var(--text-muted)',
      confirmButtonText: 'ยืนยันยกเลิก',
      cancelButtonText: 'ปิด'
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        if (row.rawItem && row.rawItem._rawRowNumber) {
          const s = getSettings();
          const ฐานข้อมูลUrl = s.ฐานข้อมูลUrl || '';
          await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'update',
              sheet: 'sales_pr_header',
              row_number: row.rawItem._rawRowNumber,
              data: { ...row.rawItem, status: 'Cancelled', Status: 'Cancelled' }
            })
          });
        }
        Swal.fire('ยกเลิกแล้ว!', 'ใบเสนอราคานี้ถูกยกเลิกแล้ว', 'success');
        refreshData();
      } catch (err) {
        console.error('Error cancelling', err);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกเอกสารได้', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '1rem 0' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title-lg" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>ประวัติใบเสนอราคา</h1>
          <p className="subtitle">รายการใบเสนอราคาที่เคยสร้างไว้ทั้งหมด</p>
        </div>
        <button className="btn-primary" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} onClick={refreshData} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? "spin" : ""} /> รีเฟรชข้อมูล
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
              {data.map((row, idx) => {
                const isCancelled = (row.status || row['สถานะ']) === 'Cancelled';
                return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', opacity: isCancelled ? 0.6 : 1 }}>
                  <td style={{ padding: '1rem', fontWeight: 500, textDecoration: isCancelled ? 'line-through' : 'none' }}>{row.id || row['เลขที่เอกสาร']}</td>
                  <td style={{ padding: '1rem' }}>{row.date || row['วันที่']}</td>
                  <td style={{ padding: '1rem' }}>{row.customer || row['ลูกค้า']}</td>
                  <td style={{ padding: '1rem', color: isCancelled ? 'var(--text-muted)' : 'var(--accent-primary)', fontWeight: 600 }}>
                    {new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(row.total || row['ยอดรวมสุทธิ'] || 0)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '99px', 
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.1)' : 
                                       (row.status || row['สถานะ']) === 'รอคลังจัดส่ง (SO)' ? 'rgba(59, 130, 246, 0.1)' : // Blue
                                       (row.status || row['สถานะ']) === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : // Green
                                       'rgba(245, 158, 11, 0.1)', // Yellow
                      color: isCancelled ? 'var(--danger)' : 
                             (row.status || row['สถานะ']) === 'รอคลังจัดส่ง (SO)' ? '#3b82f6' :
                             (row.status || row['สถานะ']) === 'Completed' ? 'var(--success)' : '#f59e0b'
                    }}>
                      {row.status || row['สถานะ'] || 'Pending'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                    <button onClick={() => handlePreview(row)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }} title="ดูพรีวิว">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleDownload(row)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }} title="ดาวน์โหลด/พิมพ์">
                      <Download size={18} />
                    </button>
                    <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="สร้างใหม่จากใบนี้">
                      <FileText size={18} />
                    </button>
                    <button onClick={() => handleCancel(row)} disabled={isCancelled} style={{ background: 'none', border: 'none', color: isCancelled ? 'var(--border-color)' : 'var(--danger)', cursor: isCancelled ? 'not-allowed' : 'pointer' }} title={isCancelled ? "ยกเลิกแล้ว" : "ยกเลิกใบเสนอราคา"}>
                      <Ban size={18} />
                    </button>
                  </td>
                </tr>
                );
              })}
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

      {/* Modal Preview */}
      {previewData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem'
        }} className="no-print">
          <div style={{
            background: 'var(--bg-primary)', width: '100%', maxWidth: '1000px', height: '90vh',
            borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>พรีวิวใบเสนอราคา {previewData.quotation_no}</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => window.print()} className="btn-primary" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--accent-secondary)' }}>
                  <Printer size={16} /> พิมพ์ / PDF
                </button>
                <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem' }}>
                  <X size={24} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: '#e5e7eb', display: 'flex', justifyContent: 'center' }}>
              <QuotationPrintPreview 
                quoteData={previewData}
                settings={getSettings()}
                paginatedItems={
                  Array.from({ length: Math.max(1, Math.ceil((previewData.items || []).length / 20)) }, (_, i) => 
                    (previewData.items || []).slice(i * 20, (i + 1) * 20)
                  )
                }
                totalPages={Math.max(1, Math.ceil((previewData.items || []).length / 20))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
