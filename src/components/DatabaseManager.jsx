import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, AlertTriangle, Check, X } from 'lucide-react';

const getN8nUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return settings.n8nUrl || '';
  } catch {
    return '';
  }
};

export default function DatabaseManager() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${getN8nUrl()}/webhook/project`, { method: 'GET' });
      
      if (response.ok) {
        const result = await response.json();
        
        let rawData = [];
        if (Array.isArray(result) && result[0]?.json) rawData = result.map(item => item.json);
        else if (Array.isArray(result)) rawData = result;
        else if (result && Array.isArray(result.data)) rawData = result.data;
        else if (typeof result === 'object' && result !== null && !result.error) rawData = [result];
        else {
          setErrorMsg(`ข้อมูลผิดรูปแบบ: ${JSON.stringify(result).substring(0, 100)}`);
          setIsLoading(false);
          return;
        }

        const mappedData = rawData.map((row, index) => ({
          rowNumber: row.row_number || index + 2,
          id: row['รหัสลูกค้า/ผู้ขาย'] || row.id || '-',
          name: row['ชื่อลูกค้า/ผู้ขาย'] || row.name || '-',
          taxId: row['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || row.taxId || '-',
          type: row['ชื่อกลุ่มระดับลูกค้า/ผู้ขาย'] || row.type || '-',
          contact: row['ผู้ติดต่อ'] || row.contact || '-',
          phone: row['โทรศัพท์'] || row.phone || '-',
          email: row['อีเมล'] || row.email || '-',
          address: row['ที่อยู่ 1'] || row.address || '-',
          district: row['อำเภอ'] || row.district || '-',
          province: row['จังหวัด'] || row.province || '-',
          credit: row['เครดิต (วัน)'] || row.credit || '-',
          limit: row['วงเงิน'] || row.limit || '-',
          remark: row['หมายเหตุ'] || row.remark || '-',
        })).filter(row => row.name && row.name !== '-');
        
        setData(mappedData);
      } else {
        setErrorMsg(`เชื่อมต่อล้มเหลว (Error ${response.status})`);
      }
    } catch (error) {
      setErrorMsg(`เชื่อมต่อ n8n ไม่ได้ โปรดตรวจสอบระบบ`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm(row);
  };

  const cancelEdit = () => {
    if (editForm.isNew) {
      setData(data.filter(r => r.id !== editForm.id));
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleAdd = () => {
    const newId = `NEW_${Date.now()}`;
    const newRow = {
      id: newId, name: '', taxId: '', type: 'Customer', contact: '',
      phone: '', email: '', address: '', district: '', province: '',
      credit: '', limit: '', remark: '', isNew: true, rowNumber: 999999
    };
    setData([newRow, ...data]);
    setEditingId(newId);
    setEditForm({ ...newRow, id: '' }); 
  };

  const handleEditChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${getN8nUrl()}/webhook/database-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', data: editForm })
      });
      
      if (response.ok) {
        setEditingId(null);
        fetchCustomers(); 
      } else {
        const errorText = await response.text();
        alert(`บันทึกไม่สำเร็จ:\n${errorText.substring(0, 300)}`);
      }
    } catch (error) {
      alert(`เชื่อมต่อไม่ได้: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (window.confirm(`ลบ ${row.name} ใช่หรือไม่?`)) {
      setIsSaving(true);
      try {
        const response = await fetch(`${getN8nUrl()}/webhook/database-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', data: { id: row.id, rowNumber: row.rowNumber } })
        });
        
        if (response.ok) fetchCustomers();
        else {
          const errorText = await response.text();
          alert(`ลบไม่สำเร็จ:\n${errorText.substring(0, 300)}`);
        }
      } catch (error) {
        alert(`เชื่อมต่อไม่ได้: ${error.message}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div style={{ maxWidth: '100%', margin: '0 auto', padding: '1rem 0' }}>
      <style>{`
        .minimal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
          padding: 0 0.5rem;
        }
        .minimal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.2rem 0;
          letter-spacing: -0.02em;
        }
        .minimal-subtitle {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
        }
        .minimal-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }
        .minimal-table-wrapper {
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .minimal-table-wrapper::-webkit-scrollbar {
          height: 6px;
        }
        .minimal-table-wrapper::-webkit-scrollbar-thumb {
          background-color: var(--border-color);
          border-radius: 10px;
        }
        .minimal-table {
          width: max-content;
          min-width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .minimal-table th {
          background: var(--bg-primary);
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 1rem 1.2rem;
          font-weight: 600;
          border-bottom: 1px solid var(--border-color);
          white-space: nowrap;
        }
        .minimal-table td {
          padding: 0.8rem 1.2rem;
          font-size: 0.9rem;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
          white-space: nowrap;
          background: var(--bg-secondary);
        }
        .minimal-table tbody tr {
          transition: background-color 0.15s;
        }
        .minimal-table tbody tr:hover td {
          background: var(--bg-tertiary);
        }
        .minimal-table tbody tr:last-child td {
          border-bottom: none;
        }
        .minimal-input {
          background: transparent;
          border: 1px solid transparent;
          border-bottom: 1px solid var(--border-color);
          border-radius: 0;
          padding: 0.4rem 0.2rem;
          color: var(--text-primary);
          width: 100%;
          outline: none;
          transition: all 0.2s;
          font-size: 0.9rem;
          font-family: inherit;
        }
        .minimal-input:focus {
          border-bottom-color: var(--accent-primary);
        }
        .minimal-input:hover:not(:focus) {
          border-bottom-color: var(--text-muted);
        }
        .sticky-col {
          position: sticky;
          right: 0;
          background: var(--bg-secondary) !important;
          box-shadow: -4px 0 15px rgba(0,0,0,0.03);
          z-index: 2;
          text-align: right;
        }
        .minimal-table tbody tr:hover .sticky-col {
          background: var(--bg-tertiary) !important;
        }
        .btn-icon {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          margin-left: 0.25rem;
        }
        .btn-icon:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .btn-icon.success:hover {
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
        }
        .btn-icon.danger:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }
        .btn-pill {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 99px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-pill:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--text-muted);
        }
        .btn-pill.primary {
          background: var(--text-primary);
          color: var(--bg-primary);
          border: none;
        }
        .btn-pill.primary:hover:not(:disabled) {
          background: var(--text-secondary);
        }
        .btn-pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="minimal-header">
        <div>
          <h1 className="minimal-title">Database</h1>
          <p className="minimal-subtitle">Manage your customers and vendors seamlessly</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-pill" onClick={fetchCustomers} disabled={isLoading || isSaving}>
            <RefreshCw size={14} className={isLoading ? 'pulse' : ''} />
            Sync
          </button>
          <button className="btn-pill primary" onClick={handleAdd} disabled={isLoading || isSaving || editingId}>
            <Plus size={16} />
            New Entry
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="minimal-card">
        <div className="minimal-table-wrapper">
          <table className="minimal-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company Name</th>
                <th>Tax ID</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>District</th>
                <th>Province</th>
                <th>Credit</th>
                <th>Limit</th>
                <th>Remark</th>
                <th className="sticky-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.rowNumber} style={{ opacity: isSaving && editingId === row.id ? 0.5 : 1 }}>
                  {editingId === row.id ? (
                    <>
                      <td>{editForm.isNew ? <input type="text" className="minimal-input" style={{ width: '80px' }} value={editForm.id} onChange={(e) => handleEditChange('id', e.target.value)} placeholder="ID..." /> : <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{row.id}</span>}</td>
                      <td><input type="text" className="minimal-input" style={{ width: '150px' }} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} placeholder="Company Name" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '120px' }} value={editForm.taxId} onChange={(e) => handleEditChange('taxId', e.target.value)} placeholder="Tax ID" /></td>
                      <td>
                        <select className="minimal-input" style={{ width: '100px', cursor: 'pointer' }} value={editForm.type} onChange={(e) => handleEditChange('type', e.target.value)}>
                          <option value="Customer">Customer</option>
                          <option value="Vendor">Vendor</option>
                        </select>
                      </td>
                      <td><input type="text" className="minimal-input" style={{ width: '100px' }} value={editForm.contact} onChange={(e) => handleEditChange('contact', e.target.value)} placeholder="Name" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '100px' }} value={editForm.phone} onChange={(e) => handleEditChange('phone', e.target.value)} placeholder="Phone" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '150px' }} value={editForm.email} onChange={(e) => handleEditChange('email', e.target.value)} placeholder="Email" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '200px' }} value={editForm.address} onChange={(e) => handleEditChange('address', e.target.value)} placeholder="Address" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '100px' }} value={editForm.district} onChange={(e) => handleEditChange('district', e.target.value)} placeholder="District" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '100px' }} value={editForm.province} onChange={(e) => handleEditChange('province', e.target.value)} placeholder="Province" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '80px' }} value={editForm.credit} onChange={(e) => handleEditChange('credit', e.target.value)} placeholder="Days" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '100px' }} value={editForm.limit} onChange={(e) => handleEditChange('limit', e.target.value)} placeholder="0.00" /></td>
                      <td><input type="text" className="minimal-input" style={{ width: '150px' }} value={editForm.remark} onChange={(e) => handleEditChange('remark', e.target.value)} placeholder="..." /></td>
                      <td className="sticky-col">
                        <button onClick={handleSave} className="btn-icon success" title="Save"><Check size={18} /></button>
                        <button onClick={cancelEdit} className="btn-icon" title="Cancel"><X size={18} /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 500 }}>{row.id}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</td>
                      <td>{row.taxId}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 500, 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '99px',
                          background: row.type.includes('Customer') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: row.type.includes('Customer') ? 'var(--success)' : '#3b82f6'
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td>{row.contact}</td>
                      <td>{row.phone}</td>
                      <td>{row.email}</td>
                      <td><div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.address}</div></td>
                      <td>{row.district}</td>
                      <td>{row.province}</td>
                      <td>{row.credit}</td>
                      <td>{row.limit}</td>
                      <td><div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.remark}</div></td>
                      <td className="sticky-col">
                        <button onClick={() => startEdit(row)} className="btn-icon" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(row)} className="btn-icon danger" title="Delete"><Trash2 size={16} /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
