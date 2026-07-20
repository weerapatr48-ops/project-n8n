import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, Sparkles, Printer, User, CheckCircle2, Package,
  Users, FilePlus, AlertCircle, X, UserPlus, Pencil, Trash2,
  BarChart3, MessageSquare, ChevronDown, RefreshCw, Layers
} from 'lucide-react';

const getN8nUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    return settings.n8nUrl || '';
  } catch { return ''; }
};

const THBText = (number) => {
  if (!number || isNaN(number) || number === 0) return "ศูนย์บาทถ้วน";
  const numStr = Number(number).toFixed(2);
  const [bahtStr, satangStr] = numStr.split('.');
  
  const readNumber = (str) => {
    const txtNum = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const txtUnit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
    let res = "";
    let len = str.length;
    for (let i = 0; i < len; i++) {
      let digit = parseInt(str[i]);
      let pos = len - i - 1;
      if (digit !== 0) {
        if (digit === 1 && pos === 0 && len > 1) res += "เอ็ด";
        else if (digit === 2 && pos === 1) res += "ยี่";
        else if (digit === 1 && pos === 1) res += "";
        else res += txtNum[digit];
        res += txtUnit[pos];
      }
    }
    return res;
  };

  let bStr = bahtStr;
  let parts = [];
  while(bStr.length > 6) {
    parts.unshift(bStr.slice(-6));
    bStr = bStr.slice(0, -6);
  }
  parts.unshift(bStr);
  
  let bahtRes = parts.map(p => readNumber(p)).filter(p => p !== "").join("ล้าน");
  if (bahtRes) bahtRes += "บาท";
  
  let satangRes = "";
  if (parseInt(satangStr) > 0) satangRes += readNumber(satangStr) + "สตางค์";
  else satangRes += "ถ้วน";
  
  return bahtRes + satangRes;
};


const SUGGESTIONS = [
  { icon: <FilePlus size={14} />, text: 'ออกใบเสนอราคาคอมพิวเตอร์ 2 เครื่อง ราคา 25,000 บาท' },
  { icon: <UserPlus size={14} />, text: 'เพิ่มลูกค้าใหม่ชื่อ บริษัท เทสต์ จำกัด เบอร์ 081-234-5678' },
  { icon: <Pencil size={14} />, text: 'แก้ไขชื่อลูกค้า บริษัท A เป็น บริษัท B จำกัด' },
  { icon: <Trash2 size={14} />, text: 'ลบลูกค้าชื่อ สมชาย ใจดี ออกจากระบบ' },
  { icon: <Package size={14} />, text: 'ตัดสต็อกสินค้า Laptop Dell 3 เครื่อง' },
  { icon: <BarChart3 size={14} />, text: 'เพิ่มสต็อกสินค้า iPhone 15 จำนวน 10 เครื่อง' },
];

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
    </span>
  );
}

function ActionBadge({ type }) {
  const cfg = {
    quotation:  { label: 'ใบเสนอราคา',  bg: '#dbeafe', color: '#1d4ed8', icon: <FilePlus size={11}/> },
    database:   { label: 'ฐานข้อมูล',   bg: '#dcfce7', color: '#15803d', icon: <Users size={11}/> },
    stock:      { label: 'สต็อกสินค้า', bg: '#fef9c3', color: '#a16207', icon: <Package size={11}/> },
    success:    { label: 'สำเร็จ',       bg: '#dcfce7', color: '#15803d', icon: <CheckCircle2 size={11}/> },
    error:      { label: 'ผิดพลาด',      bg: '#fee2e2', color: '#b91c1c', icon: <AlertCircle size={11}/> },
    reply:      { label: 'ข้อความ',      bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', icon: <MessageSquare size={11}/> },
  };
  const c = cfg[type] || cfg.reply;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
      borderRadius: 999, backgroundColor: c.bg, color: c.color,
      marginBottom: 6
    }}>
      {c.icon} {c.label}
    </span>
  );
}

function QuotationPreview({ data, issuerInfo, onClose }) {
  const items = data?.items || [];
  const customer = data?.customerInfo || {};
  const today = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const total = items.reduce((s, i) => s + Number(i.quantity||0) * Number(i.price||0), 0);
  const fmt = (n) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(n);
  const vat = total * 0.07;

  const handlePrint = () => {
    const printContent = document.getElementById('quotation-print-area');
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>ใบเสนอราคา</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #111; padding: 40px; }
        h1 { font-size: 28px; color: #4f46e5; margin: 0; }
        h2 { margin: 0; font-size: 14px; color: #555; }
        .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .section { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .label { color: #888; font-size: 12px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; padding: 10px 14px; font-size: 12px; }
        td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
        .total-row td { font-weight: 700; background: #f8fafc; }
        .grand-total td { font-weight: 900; font-size: 16px; color: #4f46e5; }
        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .sig-line { border-top: 1px solid #ccc; width: 200px; text-align: center; padding-top: 8px; color: #555; font-size: 12px; }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 800, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-primary)' }}>
            <FilePlus size={20} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>ใบเสนอราคา (ร่าง)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handlePrint} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(255,255,255,0.2)', color: 'var(--text-primary)',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
              padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
            }}>
              <Printer size={14} /> พิมพ์ / PDF
            </button>
            <button onClick={onClose} style={{
              backgroundColor: 'rgba(255,255,255,0.15)', color: 'var(--text-primary)',
              border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer'
            }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Print Area */}
        <div id="quotation-print-area" style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {/* Company & Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', margin: '0 0 4px 0' }}>
                {issuerInfo.companyName || 'บริษัทของคุณ'}
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issuerInfo.companyAddress}</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>โทร {issuerInfo.companyPhone}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-muted)', opacity: 0.3, letterSpacing: 4 }}>QUOTATION</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>ใบเสนอราคา</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>วันที่: {today}</div>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: 10,
            padding: '1.2rem 1.5rem', marginBottom: '1.5rem',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>ข้อมูลลูกค้า</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                ['ชื่อ/บริษัท', customer.name],
                ['เลขภาษี', customer.taxId],
                ['ที่อยู่', customer.address],
                ['โทรศัพท์', customer.phone],
              ].map(([label, val]) => val ? (
                <div key={label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--accent-primary)' }}>
                {['#', 'รายละเอียด', 'จำนวน', 'ราคา/หน่วย', 'รวม'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem', textAlign: h === '#' || h === 'จำนวน' ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{item.description}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(item.price)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmt(Number(item.quantity) * Number(item.price))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
            <div style={{ width: 400 }}>
              {[
                ['ราคาก่อนภาษี', fmt(total), false],
                ['ภาษีมูลค่าเพิ่ม (7%)', fmt(vat), false],
                ['ยอดรวมสุทธิ', fmt(total + vat), true],
              ].map(([label, val, isBold]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: isBold ? 'none' : '1px solid var(--border-color)',
                  borderTop: isBold ? '2px solid var(--text-primary)' : 'none'
                }}>
                  <span style={{ color: isBold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isBold ? 800 : 400 }}>{label}</span>
                  <span style={{ fontWeight: isBold ? 800 : 600, fontSize: isBold ? '1.2rem' : '1rem', color: isBold ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{val}</span>
                </div>
              ))}
              <div style={{ textAlign: 'center', paddingBottom: '0.75rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic', borderBottom: '2px solid var(--text-primary)' }}>
                ( {typeof THBText !== 'undefined' ? THBText(total + vat) : "ศูนย์บาทถ้วน"} )
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
            {['ผู้เสนอราคา', 'ผู้อนุมัติ', 'ผู้รับ'].map(role => (
              <div key={role} style={{ textAlign: 'center' }}>
                <div style={{ width: 160, borderBottom: '1px solid var(--border-color)', marginBottom: 8, paddingBottom: 40 }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIAssistant({ setCurrentTab, setAiQuotationData }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
    const [issuerInfo, setIssuerInfo] = useState({});
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      type: 'greeting',
      message: 'สวัสดีครับ! 👋 ผมคือ AI Assistant ของคุณ\n\nผมสามารถช่วยคุณได้ดังนี้:\n• 📄 ออกใบเสนอราคา\n• 👤 เพิ่ม / ลบ / แก้ไข ลูกค้าหรือพนักงาน\n• 📦 เพิ่มหรือตัดสต็อกสินค้า\n\nลองพิมพ์คำสั่งหรือกดตัวอย่างด้านล่างได้เลยครับ!'
    }
  ]);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  useEffect(() => {
    const fetchIssuer = async () => {
      const url = getN8nUrl();
      if (!url) return;
      try {
        const res = await fetch(`${url}/webhook/settings`);
        if (res.ok) {
          const result = await res.json();
          const d = Array.isArray(result) && result[0]?.json ? result[0].json : (Array.isArray(result) ? result[0] : result);
          if (d) setIssuerInfo({
            companyName: d['Company Name'] || '',
            companyAddress: d['Address'] || '',
            companyPhone: d['Phone'] || '',
          });
        }
      } catch {}
    };
    fetchIssuer();
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim() || isGenerating) return;
    setPrompt('');
    setShowSuggestions(false);
    setChatHistory(prev => [...prev, { role: 'user', message: text }]);
    setIsGenerating(true);

    const url = getN8nUrl();

    try {
      const res = await fetch(`${url}/webhook/ai-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({ prompt: text })
      });

      if (res.ok) {
        const data = await res.json();
        const action = data.action || 'reply';
        const msg = data.message || 'ดำเนินการเรียบร้อยครับ ✅';

        setChatHistory(prev => [...prev, { role: 'ai', type: action, message: msg }]);

        if (action === 'quotation' && data.data) {
          if (setAiQuotationData) setAiQuotationData(data.data);
          if (setCurrentTab) setCurrentTab('quote_maker');
        }
      } else {
        const errText = await res.text();
        setChatHistory(prev => [...prev, {
          role: 'ai', type: 'error',
          message: `❌ เกิดข้อผิดพลาด (${res.status})\n${errText.substring(0, 200)}`
        }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'ai', type: 'error',
        message: '❌ ไม่สามารถติดต่อเซิร์ฟเวอร์ n8n ได้\nโปรดตรวจสอบว่า n8n กำลังทำงานและ URL ถูกต้องครับ'
      }]);
    } finally {
      setIsGenerating(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(prompt); };

  const getAvatarStyle = (type) => {
    const map = {
      quotation: { bg: '#4f46e5' },
      database:  { bg: '#16a34a' },
      stock:     { bg: '#d97706' },
      error:     { bg: '#dc2626' },
      greeting:  { bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
    };
    return map[type] || { bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: 0 }}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .msg-bubble { animation: slideUp 0.3s ease; }
        .suggestion-chip:hover {
          background: var(--accent-primary) !important;
          color: #fff !important;
          border-color: var(--accent-primary) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .suggestion-chip { transition: all 0.2s ease; }
        .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 6px 20px rgba(79,70,229,0.4); }
        .send-btn { transition: all 0.2s ease; }
        .chat-input:focus { outline: none; box-shadow: 0 0 0 3px rgba(79,70,229,0.15); }
      `}</style>



      {/* Chat Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        backgroundColor: 'var(--bg-primary)'
      }}>
        {chatHistory.map((chat, idx) => (
          <div key={idx} className="msg-bubble" style={{
            display: 'flex',
            gap: '0.75rem',
            alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '78%',
            flexDirection: chat.role === 'user' ? 'row-reverse' : 'row'
          }}>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: chat.role === 'user' ? 'var(--bg-tertiary)' : getAvatarStyle(chat.type).bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: chat.role === 'user' ? 'var(--text-secondary)' : '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}>
              {chat.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
            </div>

            {/* Bubble */}
            <div>
              {chat.role === 'ai' && chat.type && chat.type !== 'greeting' && (
                <ActionBadge type={chat.type} />
              )}
              <div style={{
                padding: '0.9rem 1.1rem',
                borderRadius: 16,
                borderTopRightRadius: chat.role === 'user' ? 4 : 16,
                borderTopLeftRadius: chat.role === 'ai' ? 4 : 16,
                backgroundColor: chat.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: chat.role === 'user' ? 'var(--bg-primary)' : 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                boxShadow: chat.role === 'user' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                border: chat.role === 'ai' ? '1px solid var(--border-color)' : 'none',
                whiteSpace: 'pre-line'
              }}>
                {chat.message}
              </div>

            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isGenerating && (
          <div className="msg-bubble" style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start', maxWidth: '78%' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)'
            }}>
              <Bot size={16}/>
            </div>
            <div style={{
              padding: '0.9rem 1.2rem',
              borderRadius: 16, borderTopLeftRadius: 4,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <TypingDots />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>AI กำลังคิด...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12}/> ตัวอย่างคำสั่ง
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} className="suggestion-chip" onClick={() => setPrompt(s.text)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.78rem', padding: '5px 12px', borderRadius: 999,
                backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: 500
              }}>
                {s.icon} {s.text.length > 35 ? s.text.substring(0, 35) + '…' : s.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="button" onClick={() => setShowSuggestions(!showSuggestions)} style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s'
          }}>
            <ChevronDown size={16} style={{ transform: showSuggestions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}/>
          </button>

          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="พิมพ์คำสั่ง เช่น เพิ่มลูกค้าชื่อ สมชาย โทร 081-xxx-xxxx..."
            style={{
              flex: 1, height: 44, padding: '0 1rem',
              borderRadius: 12, fontSize: '0.9rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1.5px solid var(--border-color)',
              color: 'var(--text-primary)',
              transition: 'all 0.2s'
            }}
          />

          <button type="submit" disabled={isGenerating || !prompt.trim()} className="send-btn" style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: isGenerating || !prompt.trim() ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
            color: isGenerating || !prompt.trim() ? 'var(--text-muted)' : '#fff',
            boxShadow: isGenerating || !prompt.trim() ? 'none' : '0 4px 14px rgba(79,70,229,0.4)'
          }}>
            {isGenerating ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }}/> : <Send size={18}/>}
          </button>
        </form>
      </div>


    </div>
  );
}
