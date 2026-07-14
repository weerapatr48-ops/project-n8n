import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, AlertTriangle, Check, X, Database } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import StockManager from './StockManager';

const getN8nUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return settings.n8nUrl || '';
  } catch {
    return '';
  }
};

const SHEETS_CONFIG = [
  { id: 'customer', label: 'ลูกค้าและคู่ค้า (Customer)', readEndpoint: '/webhook/db-read?sheet=customer', roles: ['admin', 'manager', 'sale', 'user'] },
  { id: 'product', label: 'ฐานข้อมูลสินค้าหลัก (Product)', readEndpoint: '/webhook/db-read?sheet=product', roles: ['admin', 'manager', 'stock'] },
  { id: 'stock', label: 'เช็คสต็อก (Stock)', readEndpoint: '/webhook/db-read?sheet=stock', roles: ['admin', 'manager', 'stock'] },
  { id: 'Users', label: 'จัดการผู้ใช้งาน (Users)', readEndpoint: '/webhook/db-read?sheet=Users', roles: ['admin'] },
  { id: 'empolyee', label: 'รายชื่อพนักงาน (Employees)', readEndpoint: '/webhook/db-read?sheet=empolyee', roles: ['admin'] },
  { id: 'Quotations', label: 'ใบเสนอราคา (Quotations)', readEndpoint: '/webhook/db-read?sheet=Quotations', roles: ['admin', 'manager', 'sale'] },
  { id: 'sales_so', label: 'Sales Order (SO)', readEndpoint: '/webhook/db-read?sheet=sales_so', roles: ['admin', 'manager'] },
  { id: 'precher_po', label: 'Purchase Order (PO)', readEndpoint: '/webhook/db-read?sheet=precher_po', roles: ['admin', 'manager'] },
  { id: 'Settings', label: 'ตั้งค่าระบบอื่นๆ (Settings DB)', readEndpoint: '/webhook/db-read?sheet=Settings', roles: ['admin'] },
];

export default function DatabaseManager() {
  const { auth } = useAuth();
  const role = auth?.user?.role || 'user';
  
  // Filter sheets based on role
  const availableSheets = SHEETS_CONFIG.filter(sheet => sheet.roles.includes(role));
  
  const [activeDb, setActiveDb] = useState(availableSheets[0]?.id || '');
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeDb && activeDb !== 'stock_ui') {
      fetchData();
    }
  }, [activeDb]);

  const getActiveConfig = () => SHEETS_CONFIG.find(s => s.id === activeDb);

  const fetchData = async () => {
    const config = getActiveConfig();
    if (!config) return;
    
    setIsLoading(true);
    setErrorMsg('');
    setData([]);
    setColumns([]);
    
    try {
      const fetchUrl = config.readEndpoint.includes('?') 
          ? `${getN8nUrl()}${config.readEndpoint}&t=${Date.now()}`
          : `${getN8nUrl()}${config.readEndpoint}?t=${Date.now()}`;

      const response = await fetch(fetchUrl, { 
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        let result;
        try {
          result = text && text.trim() ? JSON.parse(text) : [];
        } catch (e) {
          console.warn('Response is not valid JSON:', text);
          result = [];
        }
        console.log('=== n8n RAW RESPONSE ===');
        console.log('IsArray:', Array.isArray(result));
        console.log('Keys:', typeof result === 'object' ? Object.keys(result).slice(0, 10) : 'N/A');
        console.log('Full result:', JSON.stringify(result).substring(0, 1000));
        let rawData = [];
        
        if (Array.isArray(result)) {
          // n8n returns array directly, or array of {json: ...} wrappers
          if (result.length > 0 && result[0]?.json) {
            rawData = result.map(item => item.json);
          } else {
            rawData = result;
          }
        } else if (result && typeof result === 'object' && !result.error) {
          // n8n sometimes returns object with numeric keys (array-like) when responseMode=lastNode
          const keys = Object.keys(result);
          const hasNumericKeys = keys.length > 0 && keys.every(k => !isNaN(k));
          
          if (hasNumericKeys) {
            // Convert array-like object {0: {...}, 1: {...}, ...} to real array
            rawData = keys.map(k => result[k]);
          } else if (Array.isArray(result.data)) {
            rawData = result.data;
          } else {
            // Single object response - wrap in array
            rawData = [result];
          }
        } else {
          setErrorMsg(`ข้อมูลผิดรูปแบบ หรือยังไม่มีข้อมูลใน n8n สำหรับ ${config.id}`);
          setIsLoading(false);
          return;
        }

        if (rawData.length > 0) {
          // Extract dynamic columns from first row, excluding internal/junk columns
          const excludeCols = ['row_number', 'rowNumber', '_action', '_sheet', '_idKey'];
          let cols = Object.keys(rawData[0]).filter(k => !excludeCols.includes(k) && !k.startsWith('_'));
          
          // Move 'id' or 'รหัส' to front if exists
          const idIndex = cols.findIndex(c => c.toLowerCase() === 'id' || c === 'รหัส');
          if (idIndex > 0) {
            const idCol = cols.splice(idIndex, 1)[0];
            cols.unshift(idCol);
          }
          
          setColumns(cols);
          
          const mappedData = rawData.map((row, index) => {
            const newRow = { _rawRowNumber: row.row_number || index + 2 };
            cols.forEach(c => {
               newRow[c] = row[c] === null || row[c] === undefined ? '' : String(row[c]);
            });
            return newRow;
          });
          
          setData(mappedData);
        } else {
           setColumns(['id', 'name']); // Default fallback
           setData([]);
        }
      } else {
        setErrorMsg(`เชื่อมต่อล้มเหลว หรือยังไม่ได้สร้าง Webhook ${config.readEndpoint} ใน n8n`);
      }
    } catch (error) {
      setErrorMsg(`เชื่อมต่อ n8n ไม่ได้ (${error.message})`);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (row) => {
    // identify unique key, prefer 'id', 'รหัส', 'ID'
    const idKey = columns.find(c => c.toLowerCase() === 'id' || c === 'รหัส') || columns[0];
    setEditingId(row[idKey]);
    setEditForm(row);
  };

  const cancelEdit = () => {
    const idKey = columns.find(c => c.toLowerCase() === 'id' || c === 'รหัส') || columns[0];
    if (editForm.isNew) {
      setData(data.filter(r => r[idKey] !== editForm[idKey]));
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleAdd = () => {
    const idKey = columns.find(c => c.toLowerCase() === 'id' || c === 'รหัส') || (columns.length > 0 ? columns[0] : 'id');
    const newId = `NEW_${Date.now()}`;
    
    const newRow = { isNew: true, _rawRowNumber: 999999 };
    columns.forEach(c => newRow[c] = '');
    newRow[idKey] = newId;
    
    setData([newRow, ...data]);
    setEditingId(newId);
    setEditForm(newRow);
  };

  const handleEditChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { ...editForm };
      // Remove internal fields that should not be sent to n8n/Google Sheets
      delete payload.isNew;
      delete payload._rawRowNumber;
      
      const isInsert = editForm.isNew;
      const n8nUrl = getN8nUrl();

      console.log('=== DB WRITE REQUEST ===');
      console.log('Action:', isInsert ? 'insert' : 'update');
      console.log('Sheet:', activeDb);
      console.log('Payload:', JSON.stringify(payload));

      const idKey = columns.find(c => c.toLowerCase() === 'id' || c === 'รหัส' || c.includes('รหัสลูกค้า') || c.includes('รหัสสินค้า')) || columns[0];

      const response = await fetch(`${n8nUrl}/webhook/db-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: isInsert ? 'insert' : 'update', 
          sheet: activeDb, 
          data: payload,
          idKey: idKey,
          row_number: isInsert ? undefined : editForm._rawRowNumber
        })
      });
      
      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: isInsert ? 'เพิ่มข้อมูลเรียบร้อยแล้ว' : 'แก้ไขข้อมูลเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
        setEditingId(null);
        fetchData(); 
      } else {
        const errorText = await response.text();
        console.error('DB Write Error:', errorText);
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: errorText.substring(0, 300) });
      }
    } catch (error) {
      console.error('DB Write Exception:', error);
      Swal.fire({ icon: 'error', title: 'เชื่อมต่อไม่ได้', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (row) => {
    Swal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบข้อมูลนี้ใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบเลย'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsSaving(true);
        try {
          const response = await fetch(`${getN8nUrl()}/webhook/db-write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', sheet: activeDb, data: { row_number: row._rawRowNumber } })
          });
          
          if (response.ok) fetchData();
          else Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ' });
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'เชื่อมต่อไม่ได้', text: error.message });
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  if (availableSheets.length === 0) {
    return <div style={{ padding: '2rem' }}>คุณไม่มีสิทธิ์เข้าถึงฐานข้อมูลใดๆ</div>;
  }

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        .minimal-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; padding: 0 0.5rem; }
        .minimal-title { font-size: 1.5rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.2rem 0; letter-spacing: -0.02em; }
        .minimal-subtitle { font-size: 0.85rem; color: var(--text-muted); margin: 0; }
        .minimal-card { background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); display: flex; flex-direction: column; flex: 1; }
        .minimal-table-wrapper { overflow-x: auto; overflow-y: auto; flex: 1; scrollbar-width: thin; }
        .minimal-table { width: max-content; min-width: 100%; border-collapse: collapse; text-align: left; }
        .minimal-table th { background: var(--bg-primary); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; padding: 1rem 1.2rem; font-weight: 600; border-bottom: 1px solid var(--border-color); white-space: nowrap; position: sticky; top: 0; z-index: 10; }
        .minimal-table td { padding: 0.8rem 1.2rem; font-size: 0.9rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); white-space: nowrap; background: var(--bg-secondary); }
        .minimal-table tbody tr:hover td { background: var(--bg-tertiary); }
        .minimal-input { background: transparent; border: 1px solid transparent; border-bottom: 1px solid var(--border-color); padding: 0.4rem 0.2rem; color: var(--text-primary); width: 100%; min-width: 120px; outline: none; font-size: 0.9rem; font-family: inherit; }
        .minimal-input:focus { border-bottom-color: var(--accent-primary); }
        .sticky-col { position: sticky; right: 0; background: var(--bg-secondary) !important; box-shadow: -4px 0 15px rgba(0,0,0,0.03); z-index: 2; text-align: right; }
        .minimal-table th.sticky-col { z-index: 11; background: var(--bg-primary) !important; }
        .minimal-table tbody tr:hover .sticky-col { background: var(--bg-tertiary) !important; }
        .btn-icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.4rem; border-radius: 6px; display: inline-flex; transition: all 0.2s; margin-left: 0.25rem; }
        .btn-icon:hover { background: var(--bg-primary); color: var(--text-primary); }
        .btn-icon.success:hover { color: var(--success); background: rgba(16, 185, 129, 0.1); }
        .btn-icon.danger:hover { color: var(--danger); background: rgba(239, 68, 68, 0.1); }
        .btn-pill { background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 99px; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
        .btn-pill:hover:not(:disabled) { background: var(--bg-tertiary); border-color: var(--text-muted); }
        .btn-pill.primary { background: var(--text-primary); color: var(--bg-primary); border: none; }
        .btn-pill.primary:hover:not(:disabled) { background: var(--text-secondary); }
        .btn-pill:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="minimal-header">
        <div>
          <h1 className="minimal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={24} /> จัดการฐานข้อมูล (Dynamic)
          </h1>
          <p className="minimal-subtitle">สามารถดึงข้อมูลได้ทุกชีท และจัดการสิทธิ์ตาม Role ของคุณ</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <select 
             value={activeDb} 
             onChange={(e) => setActiveDb(e.target.value)}
             className="minimal-input"
             style={{ width: '250px', fontSize: '0.9rem', padding: '0.5rem', fontWeight: 600, color: 'var(--accent-primary)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
          >
            {availableSheets.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
          <AlertTriangle size={18} /><span>{errorMsg}</span>
        </div>
      )}

      {activeDb === 'stock_ui' ? (
        <StockManager />
      ) : (
        <div className="minimal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
             <div style={{ fontWeight: 600 }}>ตาราง: {getActiveConfig()?.label}</div>
             <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-pill" onClick={fetchData} disabled={isLoading || isSaving}>
                  <RefreshCw size={14} className={isLoading ? 'pulse' : ''} /> ดึงข้อมูลใหม่
                </button>
                <button className="btn-pill primary" onClick={handleAdd} disabled={isLoading || isSaving || editingId || columns.length === 0}>
                  <Plus size={16} /> เพิ่มข้อมูล
                </button>
             </div>
          </div>
          
          <div className="minimal-table-wrapper">
            <table className="minimal-table">
              <thead>
                <tr>
                  {columns.map(c => <th key={c}>{c}</th>)}
                  <th className="sticky-col" style={{ width: '80px' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => {
                  const idKey = columns.find(c => c.toLowerCase() === 'id' || c === 'รหัส') || columns[0];
                  const rowId = row[idKey];
                  const isEditing = editingId === rowId;
                  
                  return (
                    <tr key={`row-${i}`} style={{ opacity: isSaving && isEditing ? 0.5 : 1 }}>
                      {columns.map(col => (
                        <td key={col}>
                          {isEditing ? (
                            <input 
                              type="text" 
                              className="minimal-input" 
                              value={editForm[col] !== undefined ? editForm[col] : ''} 
                              onChange={(e) => handleEditChange(col, e.target.value)} 
                              placeholder={col}
                            />
                          ) : (
                            <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row[col] || '-'}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="sticky-col">
                        {isEditing ? (
                          <>
                            <button onClick={handleSave} className="btn-icon success" title="บันทึก"><Check size={18} /></button>
                            <button onClick={cancelEdit} className="btn-icon" title="ยกเลิก"><X size={18} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(row)} className="btn-icon" title="แก้ไข"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(row)} className="btn-icon danger" title="ลบ"><Trash2 size={16} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {data.length === 0 && !isLoading && !errorMsg && (
                   <tr>
                     <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                       <div style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>ไม่มีข้อมูลในระบบ</div>
                       <button className="btn-pill primary" onClick={handleAdd} style={{ margin: '0 auto' }}>
                         <Plus size={16} /> คลิกที่นี่เพื่อเพิ่มข้อมูล
                       </button>
                     </td>
                   </tr>
                )}
                {isLoading && (
                   <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-primary)' }}>กำลังโหลดข้อมูล...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
