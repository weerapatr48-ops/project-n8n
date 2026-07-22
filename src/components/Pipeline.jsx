import React, { useState, useEffect } from 'react';
import { KanbanSquare, Building, PhoneCall, Mail, Clock, CheckCircle2, Activity, Plus, Trash2, FileText, Send, MessageSquare } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

// คิวสำหรับอัปเดตข้อมูล ป้องกันปัญหาแย่งกันเขียน (Write Lock) เมื่อลากการ์ดรัวๆ
let updatePromise = Promise.resolve();

export default function Pipeline({ setCurrentTab, setAiQuotationData }) {
  const { customers, pipelineData, refreshData } = useData();
  const { auth } = useAuth();
  
  const [deals, setDeals] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Add Deal Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    id: '',
    customer: '',
    amount: '',
    date: new Date().toLocaleDateString('th-TH'),
    tags: '',
    stage: 'lead'
  });

  // Activity Logger Modal State
  const [activityModalDeal, setActivityModalDeal] = useState(null);
  const [activityType, setActivityType] = useState('note');
  const [activityNote, setActivityNote] = useState('');
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  const generateNextDealId = () => {
    let maxNum = 0;
    deals.forEach(d => {
      const id = String(d.id || d.ID || d['รหัส'] || '');
      const numMatch = id.match(/\d+/); // ค้นหาตัวเลขในรหัส เช่น D005 -> 5
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    // สร้างรหัสใหม่โดยบวก 1 และเติมเลข 0 ข้างหน้าให้ครบ 3 หลัก เช่น D006
    return 'D' + String(maxNum + 1).padStart(3, '0');
  };

  const openAddModal = () => {
    setNewDealForm({
      id: generateNextDealId(),
      customer: '', // ตั้งค่าเริ่มต้นให้ว่างเปล่า เพื่อบังคับเซลส์เลือกเอง
      amount: '',
      date: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      tags: '',
      stage: 'lead'
    });
    setIsAddModalOpen(true);
  };

  const handleAddDeal = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setIsAddModalOpen(false);

    try {
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const n8nUrl = settings.n8nUrl || '';

      // Optimistic UI Update for insertion
      const updatedDeals = [...deals, newDealForm];
      setDeals(updatedDeals);

      const response = await fetch(`${n8nUrl}/webhook/db-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'insert', 
          sheet: 'pipeline', 
          data: newDealForm
        })
      });

      if (!response.ok) throw new Error('Failed to insert new deal');
      Swal.fire({ icon: 'success', title: 'เพิ่มดีลใหม่สำเร็จ!', timer: 1500, showConfirmButton: false });
      
      // ดึงข้อมูลใหม่เพื่อให้ได้ row_number จาก Google Sheets (สำคัญมากสำหรับการลบ/แก้ไขภายหลัง)
      refreshData();
      
    } catch (error) {
      console.error('Insert failed:', error);
      Swal.fire({ icon: 'error', title: 'เพิ่มดีลไม่สำเร็จ', text: 'ระบบจะดึงข้อมูลเดิมกลับมา' });
      setDeals(deals); // Revert
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDeal = async (deal) => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการลบดีล',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบดีลของ ${deal.customer || deal['ชื่อลูกค้า'] || 'ลูกค้ารายนี้'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirm.isConfirmed) return;

    setIsUpdating(true);
    try {
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const rowNumber = deal.row_number || deal.rowNumber || deal._rawRowNumber;
      
      const response = await fetch(`${settings.n8nUrl}/webhook/db-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete', 
          sheet: 'pipeline', 
          data: { row_number: rowNumber } 
        })
      });

      if (!response.ok) throw new Error('Delete failed');
      
      // Optimistic remove
      const dealId = deal.id || deal.ID || deal['รหัส'];
      setDeals(currentDeals => currentDeals.filter(d => (d.id || d.ID || d['รหัส']) !== dealId));
      
      Swal.fire({ icon: 'success', title: 'ลบดีลสำเร็จ', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Delete error:', error);
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityNote.trim() || !activityModalDeal) return;

    setIsSavingActivity(true);
    try {
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const n8nUrl = settings.n8nUrl || '';
      
      const rowNumber = activityModalDeal.row_number || activityModalDeal.rowNumber || activityModalDeal._rawRowNumber;
      if (!rowNumber) {
        throw new Error('ไม่พบ Row Number ของดีลนี้ โปรดรีเฟรชหน้าเว็บ');
      }

      // ดึงประวัติเดิมมา
      const historyStr = activityModalDeal['ประวัติการติดต่อ'] || activityModalDeal.History || '[]';
      let historyArray = [];
      try {
        historyArray = JSON.parse(historyStr);
        if (!Array.isArray(historyArray)) historyArray = [];
      } catch (e) {
        historyArray = [];
      }

      // เพิ่มประวัติใหม่
      const newActivity = {
        id: Date.now().toString(),
        type: activityType,
        text: activityNote,
        date: new Date().toLocaleString('th-TH'),
        user: auth?.user?.name || 'เซลส์'
      };
      
      historyArray.unshift(newActivity); // เอาล่าสุดไว้บนสุด
      const updatedHistoryStr = JSON.stringify(historyArray);

      // สร้าง Payload แบบเต็มๆ เหมือนตอนลากการ์ด
      const payload = { ...activityModalDeal, 'ประวัติการติดต่อ': updatedHistoryStr };
      delete payload._rawRowNumber;
      delete payload.row_number;
      delete payload.rowNumber;
      delete payload._action;
      delete payload._sheet;
      delete payload._idKey;

      const idKey = Object.keys(payload).find(k => k.toLowerCase() === 'id' || k.includes('รหัส')) || 'id';

      // อัปเดตไปยัง Google Sheets
      const response = await fetch(`${n8nUrl}/webhook/db-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          sheet: 'pipeline', 
          data: payload,
          idKey: idKey,
          row_number: rowNumber
        })
      });

      if (!response.ok) throw new Error('Failed to save activity');
      
      // Optimistic UI
      setDeals(currentDeals => currentDeals.map(d => 
        (d.id || d.ID || d['รหัส']) === (activityModalDeal.id || activityModalDeal.ID || activityModalDeal['รหัส']) 
          ? { ...d, 'ประวัติการติดต่อ': updatedHistoryStr } 
          : d
      ));

      setActivityNote('');
      setActivityModalDeal(null); // ปิดหน้าต่าง
      
    } catch (error) {
      console.error('Activity error:', error);
      Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: error.message });
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    const confirm = await Swal.fire({
      title: 'ลบประวัติการติดต่อนี่?',
      text: 'การลบนี้จะหายไปถาวร (เฉพาะ Admin เท่านั้นที่ทำได้)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบเลย'
    });

    if (!confirm.isConfirmed || !activityModalDeal) return;

    try {
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      const n8nUrl = settings.n8nUrl || '';
      
      const rowNumber = activityModalDeal.row_number || activityModalDeal.rowNumber || activityModalDeal._rawRowNumber;
      if (!rowNumber) throw new Error('ไม่พบ Row Number');

      // ดึงประวัติเดิมมา
      const historyStr = activityModalDeal['ประวัติการติดต่อ'] || activityModalDeal.History || '[]';
      let historyArray = JSON.parse(historyStr);
      
      // กรองอันที่ต้องการลบออก
      historyArray = historyArray.filter(act => act.id !== activityId);
      const updatedHistoryStr = JSON.stringify(historyArray);

      // สร้าง Payload
      const payload = { ...activityModalDeal, 'ประวัติการติดต่อ': updatedHistoryStr };
      delete payload._rawRowNumber;
      delete payload.row_number;
      delete payload.rowNumber;
      delete payload._action;
      delete payload._sheet;
      delete payload._idKey;

      const idKey = Object.keys(payload).find(k => k.toLowerCase() === 'id' || k.includes('รหัส')) || 'id';

      // อัปเดตไปยัง Google Sheets
      const response = await fetch(`${n8nUrl}/webhook/db-write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          sheet: 'pipeline', 
          data: payload,
          idKey: idKey,
          row_number: rowNumber
        })
      });

      if (!response.ok) throw new Error('Failed to delete activity');
      
      // Optimistic UI
      setDeals(currentDeals => currentDeals.map(d => 
        (d.id || d.ID || d['รหัส']) === (activityModalDeal.id || activityModalDeal.ID || activityModalDeal['รหัส']) 
          ? { ...d, 'ประวัติการติดต่อ': updatedHistoryStr } 
          : d
      ));

      // อัปเดต Modal State ด้วย
      setActivityModalDeal({ ...activityModalDeal, 'ประวัติการติดต่อ': updatedHistoryStr });

    } catch (error) {
      console.error('Delete Activity error:', error);
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ' });
    }
  };

  useEffect(() => {
    // Sync local state with context data
    if (pipelineData && pipelineData.length > 0) {
      setDeals(pipelineData);
    } else {
      setDeals([]);
    }
  }, [pipelineData]);

  const stages = [
    { id: 'lead', title: 'Leads ใหม่', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'contacted', title: 'ติดต่อไปแล้ว', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
    { id: 'quoting', title: 'ส่งใบเสนอราคา', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { id: 'negotiation', title: 'กำลังต่อรอง', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
    { id: 'closed', title: 'ปิดการขาย (Won)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'lost', title: 'ไม่ได้ไปต่อ (Lost)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
  ];

  const formatMoney = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
  };

  const handleDragStart = (e, deal) => {
    e.dataTransfer.setData('dealId', deal.id || deal.ID || deal['รหัส']);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStageId) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    console.log('[DEBUG] handleDrop triggered for dealId:', dealId, 'Target Stage:', newStageId);
    
    if (!dealId) {
      console.log('[DEBUG] Early return: dealId is empty');
      return;
    }

    // Find the deal
    const dealIndex = deals.findIndex(d => (d.id || d.ID || d['รหัส']) === dealId);
    if (dealIndex === -1) {
      console.log('[DEBUG] Early return: deal not found in deals array');
      return;
    }
    
    const deal = deals[dealIndex];
    const currentStage = (deal.stage || deal.Stage || deal['สถานะ'] || '').toLowerCase();
    
    if (currentStage === newStageId) return;

    // ระบบป้องกัน: ห้ามลากการ์ดที่เพิ่งกดสร้าง (ยังไม่ได้ row_number จาก Google Sheets)
    const rowNumber = deal.row_number || deal.rowNumber || deal._rawRowNumber;
    if (!rowNumber) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'กำลังซิงค์ข้อมูล...', 
        text: 'การ์ดใบนี้เพิ่งถูกสร้างและกำลังเชื่อมต่อกับ Google Sheets โปรดรอประมาณ 2-3 วินาทีแล้วลองลากใหม่ครับ',
        timer: 3000
      });
      return;
    }

    // Optimistic UI update
    const stageKey = Object.keys(deal).find(k => k.toLowerCase() === 'stage' || k === 'สถานะ') || 'stage';
    const oldStage = deal[stageKey];
    
    setDeals(currentDeals => currentDeals.map(d => 
      (d.id || d.ID || d['รหัส']) === dealId ? { ...d, [stageKey]: newStageId } : d
    ));

    const updatedDeal = { ...deal, [stageKey]: newStageId };

    setIsUpdating(true);
    
    // Add to queue
    updatePromise = updatePromise.then(async () => {
      try {
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const n8nUrl = settings.n8nUrl || '';
        
        const payload = { ...deal, [stageKey]: newStageId };
        
        // ลบ properties ภายในและขยะที่ติดมาจาก n8n ก่อนส่งอัปเดต
        delete payload._rawRowNumber;
        delete payload.row_number;
        delete payload.rowNumber;
        delete payload._action;
        delete payload._sheet;
        delete payload._idKey;
        delete payload['????'];
        
        const idKey = Object.keys(payload).find(k => k.toLowerCase() === 'id' || k.includes('รหัส')) || 'id';
        const rowNumber = deal.row_number || deal.rowNumber || deal._rawRowNumber;

        const response = await fetch(`${n8nUrl}/webhook/db-write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'update', 
            sheet: 'pipeline', 
            data: payload,
            idKey: idKey,
            row_number: rowNumber
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update DB: ${await response.text()}`);
        }
        
        // หน่วงเวลา 1 วินาทีก่อนให้คิวต่อไปทำงาน เพื่อให้ Google Sheets เซฟทัน
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('Update failed:', error);
        Swal.fire({ icon: 'error', title: 'อัปเดตสถานะไม่สำเร็จ', text: 'ระบบจะคืนค่าเดิม' });
        // Revert optimistic update
        setDeals(currentDeals => {
          const newDeals = [...currentDeals];
          const idx = newDeals.findIndex(d => (d.id || d.ID || d['รหัส']) === dealId);
          if (idx !== -1) newDeals[idx] = { ...newDeals[idx], [stageKey]: oldStage };
          return newDeals;
        });
      } finally {
        setIsUpdating(false);
      }
    });
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 4rem)', minHeight: 0, position: 'relative' }}>
      <div className="dashboard-header" style={{ marginBottom: '0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <KanbanSquare size={28} color="var(--accent-primary)" />
            Sales Pipeline (CRM)
            {isUpdating && <Activity size={18} className="pulse" color="var(--accent-primary)" />}
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>ลากและวางการ์ดเพื่อเปลี่ยนสถานะ หรือกดเพิ่มดีลใหม่จากฐานข้อมูลลูกค้า</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={18} /> เพิ่มดีลใหม่
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', flex: 1, minHeight: 0, alignItems: 'flex-start' }}>
        {stages.map(stage => {
          const stageDeals = deals.filter(d => {
             const s = (d.stage || d.Stage || d['สถานะ'] || '').toLowerCase();
             return s === stage.id || (stage.id === 'lead' && !s); // Default to lead if no stage
          });
          
          const stageTotal = stageDeals.reduce((sum, deal) => {
            const amount = parseFloat(deal.amount || deal.Amount || deal['ยอดเงิน'] || deal.total || 0);
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);

          return (
            <div 
              key={stage.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{ 
                flex: 1,
                minWidth: '160px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '12px', 
                padding: '1rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxHeight: '100%',
                overflowY: 'auto',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `2px solid ${stage.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stage.color }}></div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stage.title}</h3>
                </div>
                <span style={{ background: stage.bg, color: stage.color, padding: '0.15rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                  {stageDeals.length}
                </span>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                ยอดรวม: {formatMoney(stageTotal)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stageDeals.map(deal => {
                  const dealId = deal.id || deal.ID || deal['รหัส'];
                  const customerName = deal.customer || deal.Customer || deal['ชื่อลูกค้า'] || 'ไม่ระบุชื่อลูกค้า';
                  const amount = deal.amount || deal.Amount || deal['ยอดเงิน'] || deal.total || 0;
                  const date = deal.date || deal.Date || deal['วันที่'] || '';
                  const tagsStr = deal.tags || deal.Tags || deal['แท็ก'] || '';
                  const tags = tagsStr ? String(tagsStr).split(',').map(t => t.trim()) : [];

                  return (
                    <div 
                      key={dealId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                      style={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        padding: '1rem',
                        cursor: 'grab',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        opacity: isUpdating ? 0.7 : 1
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {tags.map(tag => tag && (
                            <span key={tag} style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          <Clock size={12} /> {date}
                        </div>
                      </div>
                      
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={16} color="var(--accent-primary)" />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{customerName}</span>
                      </h4>
                      
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                        {formatMoney(amount)}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                          <button style={styles.actionBtn} title="เพิ่มโน้ต" onClick={() => { setActivityType('note'); setActivityModalDeal(deal); }}><FileText size={14} /></button>
                          <button style={styles.actionBtn} title="บันทึกการโทร" onClick={() => { setActivityType('call'); setActivityModalDeal(deal); }}><PhoneCall size={14} /></button>
                          <button style={styles.actionBtn} title="บันทึกอีเมล" onClick={() => { setActivityType('email'); setActivityModalDeal(deal); }}><Mail size={14} /></button>
                          {stage.id !== 'quoting' && (
                             <button 
                               style={styles.actionBtn} 
                               onClick={() => {
                                 if (setAiQuotationData) {
                                   setAiQuotationData({
                                     customer: customerName,
                                     items: [{
                                       description: `สินค้า/บริการจากดีล ${dealId}`,
                                       quantity: 1,
                                       unit: 'รายการ',
                                       price: amount
                                     }]
                                   });
                                 }
                                 setCurrentTab('quote_maker');
                               }} 
                               title="สร้างใบเสนอราคา"
                             >
                               <CheckCircle2 size={14} />
                             </button>
                          )}
                        </div>
                        {auth?.user?.role && String(auth.user.role).trim().toLowerCase() === 'admin' && (
                          <button 
                            style={{...styles.actionBtn, color: 'var(--danger)', background: 'transparent'}} 
                            onClick={() => handleDeleteDeal(deal)}
                            title="ลบดีล (เฉพาะ Admin)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {stageDeals.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                    ลากดีลมาวางที่นี่
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Deal Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
              <Building size={24} color="var(--accent-primary)" />
              สร้างดีลใหม่ (เชื่อมต่อ Database)
            </h2>
            
            <form onSubmit={handleAddDeal}>
              <div className="input-group">
                <label className="input-label">เลือกลูกค้าจากระบบ (Customer DB)</label>
                <select 
                  className="input-field" 
                  value={newDealForm.customer}
                  onChange={e => setNewDealForm({...newDealForm, customer: e.target.value})}
                  required
                >
                  <option value="" disabled>-- โปรดเลือกลูกค้า --</option>
                  {customers.map((c, i) => {
                    const name = c.name || c.Name || c['ชื่อลูกค้า/ผู้ขาย'] || c['ชื่อลูกค้า'] || c['ชื่อ'] || `ลูกค้าคนที่ ${i+1}`;
                    return <option key={i} value={name}>{name}</option>;
                  })}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">ยอดเงิน (Amount)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="เช่น 150000"
                    value={newDealForm.amount}
                    onChange={e => setNewDealForm({...newDealForm, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">รหัสดีล (Auto)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={newDealForm.id}
                    readOnly
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">ป้ายกำกับ (Tags) *คั่นด้วยลูกน้ำ</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="เช่น VIP, ลูกค้าใหม่, ด่วน"
                  value={newDealForm.tags}
                  onChange={e => setNewDealForm({...newDealForm, tags: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="input-field" style={{ cursor: 'pointer', background: 'transparent' }}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle2 size={18} /> บันทึกดีลใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Logger Modal */}
      {activityModalDeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                    <MessageSquare size={20} color="var(--accent-primary)" /> บันทึกการติดต่อ
                  </h2>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    ลูกค้า: <strong style={{ color: 'var(--text-primary)' }}>{activityModalDeal.customer || activityModalDeal['ชื่อลูกค้า']}</strong>
                  </p>
                </div>
                <button onClick={() => setActivityModalDeal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Trash2 size={18} style={{ opacity: 0 }} /> {/* Dummy for alignment, we can just use text or X but user can click cancel below */}
                </button>
              </div>
            </div>

            {/* Timeline History */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 600 }}>ประวัติการติดต่อล่าสุด</h3>
              {(() => {
                const historyStr = activityModalDeal['ประวัติการติดต่อ'] || activityModalDeal.History || '[]';
                let historyArray = [];
                try { historyArray = JSON.parse(historyStr); } catch (e) {}
                
                if (!Array.isArray(historyArray) || historyArray.length === 0) {
                  return <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>ยังไม่มีประวัติการติดต่อ</div>;
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {historyArray.map(act => (
                      <div key={act.id} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '99px', background: act.type === 'call' ? 'rgba(59, 130, 246, 0.1)' : act.type === 'email' ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-tertiary)', color: act.type === 'call' ? '#3b82f6' : act.type === 'email' ? '#a855f7' : 'var(--text-secondary)' }}>
                            {act.type === 'call' ? '📞 โทรศัพท์' : act.type === 'email' ? '✉️ อีเมล' : '📝 โน้ต'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{act.date}</span>
                            {auth?.user?.role && String(auth.user.role).trim().toLowerCase() === 'admin' && (
                              <button 
                                onClick={() => handleDeleteActivity(act.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                                title="ลบโน้ตนี้ (Admin)"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{act.text}</p>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>โดย: {act.user}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSaveActivity} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {['note', 'call', 'email'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActivityType(type)}
                    style={{
                      flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      background: activityType === type ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: activityType === type ? '#fff' : 'var(--text-secondary)',
                      borderColor: activityType === type ? 'var(--accent-primary)' : 'var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type === 'note' ? '📝 โน้ต' : type === 'call' ? '📞 โทรศัพท์' : '✉️ อีเมล'}
                  </button>
                ))}
              </div>
              <textarea
                autoFocus
                className="input-field"
                placeholder="พิมพ์รายละเอียดการติดต่อ..."
                value={activityNote}
                onChange={e => setActivityNote(e.target.value)}
                style={{ width: '100%', minHeight: '100px', resize: 'vertical', marginBottom: '1rem', padding: '1rem' }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setActivityModalDeal(null)} className="input-field" style={{ cursor: 'pointer', background: 'transparent', width: 'auto' }}>
                  ปิด
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingActivity || !activityNote.trim()}>
                  {isSavingActivity ? <Activity size={18} className="pulse" /> : <Send size={18} />}
                  บันทึกประวัติ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  actionBtn: {
    background: 'var(--bg-tertiary)',
    border: 'none',
    borderRadius: '6px',
    padding: '0.4rem',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s, color 0.2s'
  }
};
