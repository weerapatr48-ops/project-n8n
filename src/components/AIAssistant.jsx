import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, Sparkles, Printer, User, CheckCircle2, Package,
  Users, FilePlus, AlertCircle, X, UserPlus, Pencil, Trash2,
  BarChart3, MessageSquare, ChevronDown, RefreshCw, Layers
} from 'lucide-react';
import { useData, GAS_URL } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';


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
  { icon: <UserPlus size={14} />, text: 'เพิ่มลูกค้าใหม่ชื่อ บริษัท เทสต์ จำกัด เป็น vendor' },
  { icon: <Pencil size={14} />, text: 'แก้ไขชื่อลูกค้า บริษัท A เป็น บริษัท B จำกัด' },
  { icon: <Package size={14} />, text: 'เพิ่มสินค้าใหม่ชื่อ เม้าส์ไร้สาย ราคา 500' },
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
  const fmt = (n) => {
    const num = Number(n) || 0;
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
  };
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
  const { auth } = useAuth();
  const { customers, products, stockData, refreshData } = useData();
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
      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      if (localProfile.companyName) {
        setIssuerInfo(localProfile);
      }
    };
    fetchIssuer();
  }, []);

  const sendMessage = async (text) => {
    if (!text.trim() || isGenerating) return;
    setPrompt('');
    setShowSuggestions(false);
    setChatHistory(prev => [...prev, { role: 'user', message: text }]);
    setIsGenerating(true);

    const s = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const apiKey = s.geminiApiKey;
    
    if (!apiKey) {
      setChatHistory(prev => [...prev, {
        role: 'ai', type: 'error',
        message: '❌ ยังไม่ได้ตั้งค่า Gemini API Key\nกรุณาไปที่เมนูตั้งค่าระบบเพื่อใส่ API Key ก่อนครับ'
      }]);
      setIsGenerating(false);
      return;
    }
    const STANDARD_CUST_HEADERS = ['รหัสลูกค้า/ผู้ขาย', 'ชื่อลูกค้า/ผู้ขาย', 'รหัส PIC', 'เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย', 'ชื่อกลุ่มระดับลูกค้า/ผู้ขาย', 'ผู้ติดต่อ', 'ที่อยู่ 1', 'อีเมล', 'โทรศัพท์', 'รายชื่อผู้ติดต่อทั้งหมด', 'หมายเหตุ'];
    const STANDARD_PROD_HEADERS = ['รหัส', 'ชื่อ', 'ชื่อจำเพราะ', 'หน่วย', 'ประเภทสินค้า', 'ประเภทสินค้า2', 'ราคาซื้อ', 'ราคาขาย', 'อัตราภาษีซื้อ', 'อัตราภาษีขาย', 'บาร์โค๊ด', 'ครีเวิด', 'จำกัดจำนวน', 'สถานะ', 'แบรนด์', 'กลุ่มสินค้า', 'ผู้สร้าง', 'ผู้แก้ไขล่าสุด', 'วันที่สร้าง', 'วันที่แก้ไขล่าสุด', 'หมายเหตุ1', 'หมายเหตุ2'];
    
    let allCustKeys = new Set(STANDARD_CUST_HEADERS);
    (customers || []).forEach(c => Object.keys(c).forEach(k => allCustKeys.add(k)));
    const custHeaders = Array.from(allCustKeys).filter(k => k !== 'row_number' && k !== '_rawRowNumber').join(', ');
    
    let allProdKeys = new Set(STANDARD_PROD_HEADERS);
    (products || []).forEach(p => Object.keys(p).forEach(k => allProdKeys.add(k)));
    const prodHeaders = Array.from(allProdKeys).filter(k => k !== 'row_number' && k !== '_rawRowNumber').join(', ');

    const payloadText = `
คุณคือผู้ช่วย AI สำหรับแอปพลิเคชันเซลส์
ผู้ใช้ต้องการให้คุณทำอะไรบางอย่างจากข้อความต่อไปนี้:
"${text}"

หัวข้อคอลัมน์ในระบบปัจจุบัน (ใช้เพื่ออ้างอิงชื่อ key ใน payload ให้ตรงกับฐานข้อมูล):
- ลูกค้า: ${custHeaders || 'ชื่อบริษัท/ลูกค้า, รหัสลูกค้า/ผู้ขาย, เบอร์โทร, เลขประจำตัวผู้เสียภาษี'}
- สินค้า: ${prodHeaders || 'ชื่อสินค้า, รหัสสินค้า, ราคาขาย, ประเภทสินค้า'}

ให้คุณตอบกลับมาในรูปแบบ JSON เท่านั้น โดยมีโครงสร้างดังนี้:
{
  "action": "frontend_db", // หรือ "quotation" หรือ "reply"
  "message": "ข้อความที่จะตอบกลับผู้ใช้สั้นๆ",
  "data": { // ถ้า action = frontend_db
    "operation": "add", // หรือ "update", "delete"
    "table": "customer", // หรือ "product", "stock"
    "payload": [ 
       // สำคัญมาก: ใส่ข้อมูลเป็น array ของ object โดย **บังคับ** ใช้ key ภาษาไทยให้ตรงกับ "หัวข้อคอลัมน์ในระบบปัจจุบัน" ด้านบนแบบเป๊ะๆ ห้ามใช้คำแปลภาษาอังกฤษเด็ดขาด!
       // หากผู้ใช้สั่งให้ "มั่ว" หรือ "ให้ครบทุกช่อง" คุณต้องพยายามใส่ข้อมูลจำลองให้ครบทุก key ในรายชื่อหัวข้อคอลัมน์
       // ถ้ามีการ UPDATE หรือ EDIT ต้องมี key "old_name" เสมอเพื่อให้ระบบหาข้อมูลเก่าเจอ
    ]
  }
}
หากผู้ใช้ต้องการร่างใบเสนอราคา ให้ตอบกลับด้วย action="quotation" และส่งข้อมูล items และ customerInfo ใน data
หากผู้ใช้แค่ทักทาย หรือถามทั่วไป ให้ตอบกลับด้วย action="reply" และ message ทักทาย
ห้ามตอบอย่างอื่นนอกจาก JSON!
`;

    try {
      // 1. ค้นหา Model ที่รองรับก่อน เพื่อแก้ปัญหา 404 Model Not Found
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!modelsRes.ok) throw new Error('API Key ไม่ถูกต้อง หรือถูกจำกัดสิทธิ์');
      
      const modelsData = await modelsRes.json();
      const availableModels = (modelsData.models || [])
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name); // e.g. "models/gemini-1.5-flash"
      
      // จัดเรียงลำดับรุ่นที่น่าจะใช้ได้
      const candidateModels = [
          ...availableModels.filter(m => m.includes('flash') && !m.includes('tts') && !m.includes('vision') && !m.includes('preview')),
          ...availableModels.filter(m => m.includes('flash') && !m.includes('tts') && !m.includes('vision')),
          ...availableModels.filter(m => m.includes('pro') && !m.includes('tts') && !m.includes('vision')),
          ...availableModels.filter(m => m.includes('gemini')),
          ...availableModels
      ];
      
      const uniqueModels = [...new Set(candidateModels)];
      if (uniqueModels.length === 0) throw new Error('ไม่พบ Model ที่รองรับใน API Key นี้');

      let res;
      for (const model of uniqueModels) {
         res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: payloadText }] }] })
         });
         // ถ้าสำเร็จ (200 OK) ให้หยุดลูปและใช้งานได้เลย
         if (res.ok) break;
      }

      if (res && res.ok) {
        const geminiRes = await res.json();
        let textRes = geminiRes.candidates[0].content.parts[0].text;
        if (textRes.includes('\`\`\`json')) {
            textRes = textRes.split('\`\`\`json')[1].split('\`\`\`')[0].trim();
        } else if (textRes.includes('\`\`\`')) {
            textRes = textRes.split('\`\`\`')[1].trim();
        }
        
        let data;
        try {
           data = JSON.parse(textRes);
        } catch(e) {
           data = { action: 'reply', message: textRes };
        }
        
        const action = data.action || 'reply';
        const msg = data.message || 'ดำเนินการเรียบร้อยครับ ✅';

        setChatHistory(prev => [...prev, { role: 'ai', type: action, message: msg }]);

        if (action === 'quotation' && data.data) {
          if (setAiQuotationData) setAiQuotationData(data.data);
          if (setCurrentTab) setCurrentTab('quote_maker');
        }

        if (action === 'frontend_db' && data.data) {
          const { operation, table, payload } = data.data;
          
          // AI might return a single object instead of an array. Wrap it in an array to be safe.
          const payloadArray = Array.isArray(payload) ? payload : (payload ? [payload] : []);
          
          if (payloadArray.length > 0) {
            // Execute sequentially to avoid Google Sheets API rate limit
            for (const item of payloadArray) {
              let mappedItem = { ...item };
              const tableName = (table || '').toLowerCase();
              
              // Map AI's JSON output to exact Google Sheets headers
              const isCustomerTable = ['customer', 'customers', 'ลูกค้า', 'vendor', 'vender', 'ผู้ขาย'].includes(tableName);
              const isProductTable = ['product', 'products', 'สินค้า', 'item', 'items', 'ชิ้นส่วน', 'อะไหล่', 'วัสดุ'].includes(tableName);
              const isStockTable = ['stock', 'stocks', 'สต็อก', 'inventory', 'คลังสินค้า', 'คลัง'].includes(tableName);
              const isUpdate = operation === 'update';
              const isDelete = operation === 'delete' || operation === 'remove';
              let rowNum = undefined;
              let finalIdKey = 'id';
              let targetSheet = table;

              if (isCustomerTable) {
                targetSheet = 'customer'; // บังคับส่งไป sheet customer เสมอ
                const custSample = (customers && customers.length > 0) ? customers[0] : {};
                const cIdKey = ('รหัสลูกค้า/ผู้ขาย' in custSample) ? 'รหัสลูกค้า/ผู้ขาย' : 'รหัสลูกค้า';
                const cNameKey = ('ชื่อลูกค้า/ผู้ขาย' in custSample) ? 'ชื่อลูกค้า/ผู้ขาย' : 'ชื่อลูกค้า';
                const cGroupKey = ('ชื่อกลุ่มระดับลูกค้า/ผู้ขาย' in custSample) ? 'ชื่อกลุ่มระดับลูกค้า/ผู้ขาย' : 'กลุ่มลูกค้า';
                
                finalIdKey = cIdKey;
                const cCode = item.id || item.customerId || item.code || item[cIdKey] || item['รหัสลูกค้า/ผู้ขาย'] || '';
                const cName = item.name || item.companyName || item.customerName || item[cNameKey] || item['ชื่อลูกค้า/ผู้ขาย'] || item['ชื่อลูกค้า'] || '';
                const oldName = item.old_name || item.oldName || item.target || item.search;
                
                let newMapped = {};
                const existingCust = (customers || []).find(c => 
                  (cCode && c[cIdKey] === cCode) || 
                  (oldName && String(c[cNameKey] || '').includes(oldName)) ||
                  (cName && String(c[cNameKey] || '').includes(cName))
                );
                
                if (existingCust) {
                  rowNum = existingCust.row_number || existingCust.rowNumber || existingCust._rawRowNumber;
                  newMapped[cIdKey] = existingCust[cIdKey];
                  if (operation === 'add') newMapped.action = 'update';
                }
                
                let rawAddress = item.address || item['ที่อยู่ 1'] || item['ที่อยู่'] || '';
                rawAddress = rawAddress.replace(/credit/ig, '').replace(/^[\s,]+|[\s,]+$/g, '');
                
                let rawGroup = (item.type || item.group || item[cGroupKey] || item['ชื่อกลุ่มระดับลูกค้า/ผู้ขาย'] || item['ระดับลูกค้า'] || item['ประเภท'] || item['ประเภทลูกค้า'] || '').toString().trim();
                let formattedGroup = rawGroup ? (rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1).toLowerCase()) : (existingCust ? existingCust[cGroupKey] : 'Credit');
                
                if (!newMapped[cIdKey]) newMapped[cIdKey] = cCode || '';
                if (!newMapped[cNameKey]) newMapped[cNameKey] = cName || '';
                newMapped[cGroupKey] = formattedGroup;
                
                if (item.contact || item.contactPerson || item.contact_name || item['ผู้ติดต่อ'] || item['บุคคลติดต่อ']) newMapped['ผู้ติดต่อ'] = item.contact || item.contactPerson || item.contact_name || item['ผู้ติดต่อ'] || item['บุคคลติดต่อ'];
                if (rawAddress) newMapped['ที่อยู่ 1'] = rawAddress;
                if (item.taxId || item['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || item['เลขภาษี']) newMapped['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] = item.taxId || item['เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย'] || item['เลขภาษี'];
                if (item.email || item['อีเมล']) newMapped['อีเมล'] = item.email || item['อีเมล'];
                if (item.phone || item.tel || item['โทรศัพท์'] || item['เบอร์โทร']) newMapped['โทรศัพท์'] = item.phone || item.tel || item['โทรศัพท์'] || item['เบอร์โทร'];
                if (item.note || item.remark || item['หมายเหตุ']) newMapped['หมายเหตุ'] = item.note || item.remark || item['หมายเหตุ'];
                
                // Copy strictly only the keys that actually exist in the known schema
                let allValidKeys = new Set(['รหัสลูกค้า/ผู้ขาย', 'ชื่อลูกค้า/ผู้ขาย', 'รหัส PIC', 'เลขประจำตัวผู้เสียภาษีอากรของลูกค้า/ผู้ขาย', 'ชื่อกลุ่มระดับลูกค้า/ผู้ขาย', 'ผู้ติดต่อ', 'ที่อยู่ 1', 'อีเมล', 'โทรศัพท์', 'รายชื่อผู้ติดต่อทั้งหมด', 'หมายเหตุ']);
                (customers || []).forEach(c => Object.keys(c).forEach(k => allValidKeys.add(k)));
                
                allValidKeys.forEach(k => {
                    if (item[k] !== undefined && newMapped[k] === undefined && k !== '_rawRowNumber' && k !== 'row_number') {
                        newMapped[k] = item[k];
                    }
                });
                
                // Auto-generate ID (CTxxx / PRxxx logic)
                if ((operation === 'add' || operation === 'insert') && (!newMapped[cIdKey] || newMapped[cIdKey] === '')) {
                  const groupValue = (newMapped[cGroupKey] || '').toString().toLowerCase();
                  let firstChar = 'C'; 
                  if (groupValue.includes('vender') || groupValue.includes('vendor')) {
                    firstChar = 'P';
                  } else if (groupValue.includes('credit')) {
                    firstChar = 'C';
                  }
                  
                  const nameValue = (newMapped[cNameKey] || '').toString();
                  const getEnglishInitial = (text) => {
                    let cleanText = text.replace(/^(บริษัท|บจก\.|บมจ\.|หจก\.|ห้างหุ้นส่วนจำกัด|ร้าน)\s*/g, '').trim();
                    if (!cleanText) cleanText = text;
                    const engMatch = cleanText.match(/[a-zA-Z]/);
                    if (engMatch) return engMatch[0].toUpperCase();
                    const consonantMatch = cleanText.match(/[ก-ฮ]/);
                    if (consonantMatch) {
                      const map = {
                        'ก':'K','ข':'K','ฃ':'K','ค':'K','ฅ':'K','ฆ':'K','ง':'N','จ':'J',
                        'ฉ':'C','ช':'C','ซ':'S','ฌ':'C','ญ':'Y','ฎ':'D','ฏ':'T','ฐ':'T',
                        'ฑ':'T','ฒ':'T','ณ':'N','ด':'D','ต':'T','ถ':'T','ท':'T','ธ':'T',
                        'น':'N','บ':'B','ป':'P','ผ':'P','ฝ':'F','พ':'P','ฟ':'F','ภ':'P',
                        'ม':'M','ย':'Y','ร':'R','ล':'L','ว':'W','ศ':'S','ษ':'S','ส':'S',
                        'ห':'H','ฬ':'L','อ':'O','ฮ':'H'
                      };
                      return map[consonantMatch[0]] || 'X';
                    }
                    return 'X';
                  };
                  
                  const secondChar = getEnglishInitial(nameValue);
                  const prefix = `${firstChar}${secondChar}`;
                  let maxNum = 0;
                  
                  (customers || []).forEach(row => {
                    const existingId = (row[cIdKey] || row['id'] || '').toString();
                    if (existingId.startsWith(prefix)) {
                      const numPart = existingId.substring(2);
                      const num = parseInt(numPart, 10);
                      if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                      }
                    }
                  });
                  
                  const nextNum = (maxNum + 1).toString().padStart(3, '0');
                  newMapped[cIdKey] = `${prefix}${nextNum}`;
                }
                
                if (mappedItem.action) newMapped.action = mappedItem.action;
                mappedItem = newMapped;
              } else if (isProductTable) {
                targetSheet = 'product'; // บังคับส่งไป sheet สินค้า
                
                // Scan all products to find the correct column headers, with defaults matching the user's typical sheet
                const hasKey = (key) => products && products.some(p => key in p);
                const nameKey = hasKey('ชื่อสินค้า') ? 'ชื่อสินค้า' : 'ชื่อ';
                const idKey = hasKey('รหัสสินค้า') ? 'รหัสสินค้า' : 'รหัส';
                const priceKey = hasKey('ราคาขาย') ? 'ราคาขาย' : (hasKey('ราคา') ? 'ราคา' : 'ราคาขาย');
                
                const prodSample = (products && products.length > 0) ? products[0] : {};
                
                finalIdKey = idKey;
                const pCode = item.code || item.productId || item[idKey] || item['รหัสสินค้า'] || item['รหัส'];
                const pName = item.name || item.productName || item[nameKey] || item['ชื่อสินค้า'] || item['ชื่อ'];
                const pPrice = item.price || item['ราคาขาย'] || item['ราคา'] || item.price_per_unit;
                const oldName = item.old_name || item.oldName || item.target || item.search;
                
                let newMapped = {};
                let existingProduct = null;
                
                if (isUpdate || isDelete || operation === 'add') {
                  existingProduct = (products || []).find(p => 
                    (pCode && (p[idKey] || p['รหัสสินค้า'] || p['รหัส'] || p.code || p.id) === pCode) ||
                    (oldName && String(p[nameKey] || p['ชื่อสินค้า'] || p['ชื่อ'] || p.name || '').includes(oldName)) ||
                    (pName && String(p[nameKey] || p['ชื่อสินค้า'] || p['ชื่อ'] || p.name || '').includes(pName))
                  );
                  
                  if (existingProduct) {
                    rowNum = existingProduct.row_number || existingProduct.rowNumber || existingProduct._rawRowNumber;
                    newMapped[idKey] = existingProduct[idKey] || existingProduct['รหัสสินค้า'] || existingProduct['รหัส'] || existingProduct.code || existingProduct.id;
                    if (operation === 'add') {
                       // If adding but already exists, switch to update
                       newMapped.action = 'update';
                    }
                  }
                }
                
                // Construct clean mapped payload
                if (!newMapped[idKey]) newMapped[idKey] = pCode || '';
                if (!newMapped[nameKey]) newMapped[nameKey] = pName || '';
                if (pPrice !== undefined) newMapped[priceKey] = pPrice;
                
                if (item.category && !newMapped['ประเภทสินค้า']) newMapped['ประเภทสินค้า'] = item.category;
                if (item.brand && !newMapped['แบรนด์']) newMapped['แบรนด์'] = item.brand;
                if (item.description && !newMapped['ชื่อจำเพราะ']) newMapped['ชื่อจำเพราะ'] = item.description;
                if (item.sku && !newMapped[idKey]) newMapped[idKey] = item.sku;
                
                // Copy strictly only the keys that actually exist in the known schema
                let allValidKeys = new Set(['รหัส', 'ชื่อ', 'ชื่อจำเพราะ', 'หน่วย', 'ประเภทสินค้า', 'ประเภทสินค้า2', 'ราคาซื้อ', 'ราคาขาย', 'อัตราภาษีซื้อ', 'อัตราภาษีขาย', 'บาร์โค๊ด', 'ครีเวิด', 'จำกัดจำนวน', 'สถานะ', 'แบรนด์', 'กลุ่มสินค้า', 'ผู้สร้าง', 'ผู้แก้ไขล่าสุด', 'วันที่สร้าง', 'วันที่แก้ไขล่าสุด', 'หมายเหตุ1', 'หมายเหตุ2']);
                (products || []).forEach(p => Object.keys(p).forEach(k => allValidKeys.add(k)));
                
                allValidKeys.forEach(k => {
                    if (item[k] !== undefined && newMapped[k] === undefined && k !== '_rawRowNumber' && k !== 'row_number') {
                        newMapped[k] = item[k];
                    }
                });
                
                if (mappedItem.action) newMapped.action = mappedItem.action;
                mappedItem = newMapped;

              } else if (isStockTable) {
                targetSheet = 'stock'; // บังคับส่งไป sheet สต็อก
                const stockSample = (stockData && stockData.length > 0) ? stockData[0] : {};
                const sIdKey = ('รหัสสินค้า' in stockSample) ? 'รหัสสินค้า' : 'รหัส';
                const sNameKey = ('ชื่อสินค้า' in stockSample) ? 'ชื่อสินค้า' : 'ชื่อ';
                
                finalIdKey = sIdKey;
                const sCode = item.code || item.productId || item[sIdKey] || item['รหัสสินค้า'] || item['รหัส'];
                const sName = item.name || item.productName || item[sNameKey] || item['ชื่อสินค้า'] || item['ชื่อ'];
                const oldName = item.old_name || item.oldName || item.target || item.search;
                
                let newMapped = {};
                const existingStock = (stockData || []).find(s => 
                  (sCode && (s[sIdKey] || s['รหัสสินค้า'] || s['รหัส'] || s.code || s.id) === sCode) ||
                  (oldName && String(s[sNameKey] || s['ชื่อสินค้า'] || s['ชื่อ'] || s.name || '').includes(oldName)) ||
                  (sName && String(s[sNameKey] || s['ชื่อสินค้า'] || s['ชื่อ'] || s.name || '').includes(sName))
                );
                
                if (existingStock) {
                  rowNum = existingStock.row_number || existingStock.rowNumber || existingStock._rawRowNumber;
                  newMapped[sIdKey] = existingStock[sIdKey] || existingStock['รหัสสินค้า'] || existingStock['รหัส'] || existingStock.code || existingStock.id;
                  
                  if (operation === 'add' || operation === 'update') {
                    // Update quantity by adding or replacing
                    const currentQty = Number(existingStock['จำนวน'] || existingStock['จำนวนคงเหลือ'] || existingStock.quantity || existingStock.qty || 0);
                    const addQty = Number(item.add_quantity || item.addQty || item.quantity || item.qty || 0);
                    newMapped['จำนวน'] = currentQty + addQty;
                  }
                } else {
                   // New stock item - check if it exists in Product database first
                   const linkedProduct = (products || []).find(p => 
                     (sCode && (p['รหัสสินค้า'] || p['รหัส'] || p.code || p.id) === sCode) ||
                     (oldName && String(p['ชื่อสินค้า'] || p['ชื่อ'] || p.name || '').includes(oldName)) ||
                     (sName && String(p['ชื่อสินค้า'] || p['ชื่อ'] || p.name || '').includes(sName))
                   );

                   if (linkedProduct) {
                     newMapped[sIdKey] = linkedProduct['รหัสสินค้า'] || linkedProduct['รหัส'] || linkedProduct.code || linkedProduct.id;
                     newMapped[sNameKey] = linkedProduct['ชื่อสินค้า'] || linkedProduct['ชื่อ'] || linkedProduct.name;
                   } else {
                     newMapped[sNameKey] = sName || '';
                   }
                   
                   newMapped['จำนวน'] = Number(item.add_quantity || item.addQty || item.quantity || item.qty || item['จำนวน'] || 0);
                }
                
                if (item.unit) newMapped['หน่วย'] = item.unit;
                
                // Copy strictly only the keys that actually exist in the Google Sheet (via stockSample)
                if (stockSample) {
                    Object.keys(stockSample).forEach(k => {
                        if (item[k] !== undefined && newMapped[k] === undefined && k !== '_rawRowNumber' && k !== 'row_number') {
                            newMapped[k] = item[k];
                        }
                    });
                }

                if (mappedItem.action) newMapped.action = mappedItem.action;
                mappedItem = newMapped;
              }

              const now = new Date().toLocaleString('th-TH');
              if (operation === 'add' || operation === 'insert') {
                if (!mappedItem['วันที่สร้าง']) mappedItem['วันที่สร้าง'] = now;
                if (!mappedItem['ผู้สร้าง']) mappedItem['ผู้สร้าง'] = auth?.user?.name || 'AI Assistant';
              }
              mappedItem['วันที่แก้ไขล่าสุด'] = now;

              let finalAction = mappedItem.action === 'update' ? 'update' : (operation === 'add' ? 'insert' : (isDelete ? 'delete' : operation));
              if (mappedItem.action) delete mappedItem.action;

              const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  action: finalAction,
                  sheet: targetSheet,
                  data: isDelete ? { row_number: rowNum } : mappedItem,
                  idKey: finalIdKey,
                  row_number: rowNum
                })
              });
              
              if (response.ok) {
                 // Auto-sync product to stock
                 if (isProductTable && (operation === 'add' || operation === 'insert')) {
                   const pCode = mappedItem['รหัสสินค้า'] || mappedItem['รหัส'] || mappedItem.code;
                   const pName = mappedItem['ชื่อสินค้า'] || mappedItem['ชื่อ'] || mappedItem.name;
                   if (pCode) {
                     const stockPayload = {
                       'รหัส': pCode,
                       'ชื่อ': pName || '',
                       'จำนวน': mappedItem['จำนวน'] || 0,
                       'หน่วย': mappedItem['หน่วย'] || 'ชิ้น',
                       'ประเภทสินค้า': mappedItem['ประเภทสินค้า'] || '',
                       'ประเภทสินค้า2': mappedItem['ประเภทสินค้า2'] || '',
                       'บาร์โค๊ด': mappedItem['บาร์โค๊ด'] || '',
                       'ครีเวิด': mappedItem['ครีเวิด'] || '',
                       'สถานะ': mappedItem['สถานะ'] || '',
                       'แบรนด์': mappedItem['แบรนด์'] || '',
                       'กลุ่มสินค้า': mappedItem['กลุ่มสินค้า'] || '',
                       'วันที่รับเข้า': mappedItem['วันที่รับเข้า'] || '',
                       'วันที่ขายออก': mappedItem['วันที่ขายออก'] || '',
                       'วันที่สร้าง': now,
                       'วันที่แก้ไขล่าสุด': now,
                       'ผู้สร้าง': auth?.user?.name || 'Auto Sync (AI)'
                     };
                     try {
                       const stockResponse = await fetch(GAS_URL, {
                         method: 'POST',
                         headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                         body: JSON.stringify({ action: 'insert', sheet: 'stock', data: stockPayload, idKey: 'รหัส' })
                       });
                       if (!stockResponse.ok) {
                         console.error('AI Auto-sync stock failed with status:', stockResponse.status);
                       }
                     } catch (e) {
                       console.error('AI Auto-sync stock request failed', e);
                     }
                    }
                 }
              }
              // Add a 500ms delay to prevent hitting Google Sheets API rate limit (60 requests/min)
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (typeof refreshData === 'function') refreshData();
          }
        }
      } else {
        const errText = await res.text();
        setChatHistory(prev => [...prev, {
          role: 'ai', type: 'error',
          message: `❌ เกิดข้อผิดพลาด (${res.status})\n${errText.substring(0, 200)}`
        }]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, {
        role: 'ai', type: 'error',
        message: `❌ เกิดข้อผิดพลาดในระบบ\n${err.message}`
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
          padding: '0.4rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
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
