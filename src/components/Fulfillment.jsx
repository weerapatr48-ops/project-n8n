import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PackageCheck, Truck, Clock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Fulfillment() {
  const { auth } = useAuth();
  const { salesSO, subSalesSO, stockData, products: masterProducts, settings, refreshData } = useData();
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Normalize data
  let soHeaders = [];
  if (Array.isArray(salesSO) && salesSO.length > 0 && salesSO[0]?.json) {
    soHeaders = salesSO.map(s => ({ ...s.json, _rawRowNumber: s.row_number || s.rowNumber }));
  } else if (Array.isArray(salesSO)) {
    soHeaders = salesSO.map((s, index) => ({ ...s, _rawRowNumber: s.row_number || s.rowNumber || (index + 2) }));
  }

  let soDetails = [];
  if (Array.isArray(subSalesSO) && subSalesSO.length > 0 && subSalesSO[0]?.json) {
    soDetails = subSalesSO.map(s => s.json);
  } else if (Array.isArray(subSalesSO)) {
    soDetails = subSalesSO;
  }

  // Filter pending SOs
  const pendingSOs = soHeaders.filter(so => 
    so.status === 'รอจัดส่ง' || so.status === 'Pending'
  ).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredSOs = pendingSOs.filter(so => 
    (so.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (so.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getItemsForSO = (soId) => {
    return soDetails.filter(d => d.so_id === soId);
  };

  const handleFulfill = async (so) => {
    const items = getItemsForSO(so.id);
    if (items.length === 0) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบรายการสินค้าในใบสั่งขายนี้', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการจัดส่ง & ตัดสต็อก',
      text: `คุณกำลังจะตัดสต็อกและยืนยันการจัดส่งสำหรับ ${so.id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันตัดสต็อก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--success)'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const n8nUrl = settings?.n8nUrl || '';
        let deductionLogs = [];

        let rawStock = [];
        if (Array.isArray(stockData) && stockData.length > 0 && stockData[0]?.json) {
          rawStock = stockData.map(i => i.json);
        } else if (Array.isArray(stockData)) {
          rawStock = stockData;
        }

        // 1. Deduct Stock and Write Logs
        for (const item of items) {
          const qtyToDeduct = Number(item.quantity) || 0;
          if (qtyToDeduct <= 0) continue;

          const stockItem = rawStock.find(s => (s['ชื่อ'] || s.name || '') === item.product_name || (s['รหัส'] || s.id || '') === item.product_code);

          if (stockItem) {
            const currentStock = Number(stockItem['จำนวน'] || 0);
            const newStock = currentStock - qtyToDeduct;
            const rowNum = stockItem._rawRowNumber || stockItem.row_number || stockItem.rowNumber;
            const payload = { ...stockItem, 'จำนวน': newStock };
            const idKey = Object.keys(payload).find(k => k.toLowerCase() === 'id' || k.includes('รหัส')) || 'id';

            delete payload._rawRowNumber; delete payload.row_number; delete payload.rowNumber;
            delete payload._action; delete payload._sheet; delete payload._idKey;

            await fetch(`${n8nUrl}/webhook/db-write`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'update', sheet: 'stock', data: payload, idKey: idKey, row_number: rowNum })
            });
          } else {
            // Insert negative stock if not found
            let rawMaster = [];
            if (Array.isArray(masterProducts) && masterProducts.length > 0 && masterProducts[0]?.json) {
              rawMaster = masterProducts.map(i => i.json);
            } else if (Array.isArray(masterProducts)) {
              rawMaster = masterProducts;
            }
            const masterProd = rawMaster.find(p => (p['ชื่อ'] || p.name || '') === item.product_name) || {};
            
            await fetch(`${n8nUrl}/webhook/db-write`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'insert',
                sheet: 'stock',
                data: {
                  id: `ST-${Date.now()}`,
                  'รหัส': masterProd['รหัส'] || masterProd['รหัสสินค้า'] || item.product_code || '',
                  'ชื่อ': item.product_name,
                  'จำนวน': -qtyToDeduct,
                  'หน่วย': item.unit || 'ชิ้น',
                  'วันที่รับเข้า/ขายออก': new Date().toISOString()
                }
              })
            });
          }

          // Log to Stock_Log
          await fetch(`${n8nUrl}/webhook/db-write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              sheet: 'Stock_Log',
              data: {
                id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                product_name: item.product_name,
                type: `ขายออก (จัดส่ง ${so.id})`,
                amount: -qtyToDeduct,
                date: new Date().toISOString()
              }
            })
          });

          deductionLogs.push(`${item.product_name} (-${qtyToDeduct})`);
        }

        // 2. Update SO status to 'จัดส่งเรียบร้อย'
        let rowNum = so._rawRowNumber || so.row_number || so.rowNumber;
        if (!rowNum && Array.isArray(salesSO)) {
          const idx = salesSO.findIndex(s => (s.json?.id || s.id) === so.id);
          if (idx >= 0) rowNum = idx + 2;
        }

        if (rowNum) {
          const payload = { ...so, status: 'จัดส่งเรียบร้อย' };
          delete payload._rawRowNumber; delete payload.row_number; delete payload.rowNumber;
          await fetch(`${n8nUrl}/webhook/db-write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', sheet: 'sales_so', data: payload, idKey: 'id', row_number: rowNum })
          });
        } else {
          console.warn("Could not find rowNum for SO, updating by ID might fail if webhook doesn't support it");
          const payload = { ...so, status: 'จัดส่งเรียบร้อย' };
          await fetch(`${n8nUrl}/webhook/db-write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', sheet: 'sales_so', data: payload, idKey: 'id' })
          });
        }

        Swal.fire('สำเร็จ', `ตัดสต็อกและจัดส่ง ${so.id} เรียบร้อยแล้ว`, 'success');
        refreshData();
      } catch (err) {
        console.error(err);
        Swal.fire('ผิดพลาด', 'ไม่สามารถทำรายการได้', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Truck size={28} color="var(--accent-primary)" /> คิวงานจัดส่ง & ตัดสต็อก
        </h1>
      </div>

      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="input-wrapper" style={{ width: '300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              className="input-field" 
              style={{ width: '100%', paddingLeft: '2.5rem' }} 
              placeholder="ค้นหาบิล SO หรือชื่อลูกค้า..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span style={{ color: 'var(--text-muted)' }}>มีรายการรอจัดส่ง {pendingSOs.length} รายการ</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {filteredSOs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
              <PackageCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>เยี่ยมมาก! ไม่มีรายการรอจัดส่งค้างอยู่</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredSOs.map((so) => {
                const isExpanded = expandedId === so.id;
                const items = getItemsForSO(so.id);

                return (
                  <div key={so.id} style={{ 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}>
                    {/* Header */}
                    <div 
                      style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isExpanded ? null : so.id)}
                    >
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>เลขที่บิล</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{so.id}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ลูกค้า</span>
                          <strong>{so.customer_name}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>วันที่ออกบิล</span>
                          <span>{new Date(so.date).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={14} /> รอจัดส่ง
                        </span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {/* Details (Expanded) */}
                    {isExpanded && (
                      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                        <h4 style={{ marginBottom: '1rem' }}>รายการสินค้าในบิล:</h4>
                        <table className="data-table" style={{ marginBottom: '1.5rem' }}>
                          <thead>
                            <tr>
                              <th>รหัส</th>
                              <th>ชื่อสินค้า</th>
                              <th style={{ textAlign: 'right' }}>จำนวน</th>
                              <th>หน่วย</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.product_code || '-'}</td>
                                <td>{item.product_name}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.quantity}</td>
                                <td>{item.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-primary" 
                            style={{ background: 'var(--success)' }}
                            onClick={() => handleFulfill(so)}
                            disabled={loading}
                          >
                            <PackageCheck size={18} /> {loading ? 'กำลังประมวลผล...' : 'ยืนยันแพ็กของ & ตัดสต็อก'}
                          </button>
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
