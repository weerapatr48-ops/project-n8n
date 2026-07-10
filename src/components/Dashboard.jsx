import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Package, FileText, TrendingUp, AlertTriangle, ArrowRight, Activity } from 'lucide-react';

export default function Dashboard() {
  const { auth, canAccess } = useAuth();
  const [data, setData] = useState({
    customers: 0,
    products: 0,
    quotationsThisMonth: 0,
    totalRevenue: 0,
    recentQuotations: [],
    lowStockProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      if (!settings.n8nUrl) throw new Error('No n8n URL');

      const res = await fetch(`${settings.n8nUrl}/webhook/dashboard`);
      const json = await res.json();
      
      if (json && !json.error) {
        setData(json);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.log('Using mock dashboard data', err);
      // Mock data for display purposes
      setData({
        customers: 145,
        products: 856,
        quotationsThisMonth: 24,
        totalRevenue: 1250000,
        recentQuotations: [
          { id: 1, quotation_no: 'QT-20260707-001', customer_name: 'บริษัท เอบีซี จำกัด', total: 45000, date: '2026-07-07', status: 'Approved' },
          { id: 2, quotation_no: 'QT-20260706-002', customer_name: 'สมชาย ขายส่ง', total: 12500, date: '2026-07-06', status: 'Pending' },
          { id: 3, quotation_no: 'QT-20260705-003', customer_name: 'XYZ Corporation', total: 850000, date: '2026-07-05', status: 'Sent' },
        ],
        lowStockProducts: [
          { id: 'P01', name: 'กระดาษ A4 Double A', amount: 5, unit: 'รีม' },
          { id: 'P02', name: 'หมึกพิมพ์ HP 85A', amount: 2, unit: 'กล่อง' },
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('approve') || s.includes('อนุมัติ')) return <span className="badge badge-success">{status}</span>;
    if (s.includes('pending') || s.includes('รอ')) return <span className="badge badge-warning">{status}</span>;
    return <span className="badge badge-info">{status}</span>;
  };

  if (!canAccess('dashboard')) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '1rem' }} />
        <h2 className="title-lg">ไม่มีสิทธิ์เข้าถึง</h2>
        <p className="subtitle">คุณไม่มีสิทธิ์ในการดูหน้าแดชบอร์ด กรุณาติดต่อผู้ดูแลระบบ</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="dashboard-header">
        <h1 className="title-lg">สวัสดี, {auth?.user?.name || 'ผู้ใช้งาน'}</h1>
        <p className="subtitle">ยินดีต้อนรับสู่ SmartQuote สรุปภาพรวมธุรกิจของคุณวันนี้</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Activity className="pulse" size={48} color="var(--accent-primary)" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div className="glass-card kpi-card" style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))' }}>
              <div style={styles.kpiIconWrapper}><Users size={24} color="#3b82f6" /></div>
              <div>
                <p style={styles.kpiLabel}>ลูกค้าทั้งหมด</p>
                <h2 style={styles.kpiValue}>{formatNumber(data.customers)} <span style={styles.kpiUnit}>ราย</span></h2>
              </div>
            </div>

            <div className="glass-card kpi-card" style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))' }}>
              <div style={styles.kpiIconWrapper}><Package size={24} color="#10b981" /></div>
              <div>
                <p style={styles.kpiLabel}>สินค้าในระบบ</p>
                <h2 style={styles.kpiValue}>{formatNumber(data.products)} <span style={styles.kpiUnit}>รายการ</span></h2>
              </div>
            </div>

            <div className="glass-card kpi-card" style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.05))' }}>
              <div style={styles.kpiIconWrapper}><FileText size={24} color="#a855f7" /></div>
              <div>
                <p style={styles.kpiLabel}>ใบเสนอราคาเดือนนี้</p>
                <h2 style={styles.kpiValue}>{formatNumber(data.quotationsThisMonth)} <span style={styles.kpiUnit}>ใบ</span></h2>
              </div>
            </div>

            <div className="glass-card kpi-card" style={{ ...styles.kpiCard, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))' }}>
              <div style={styles.kpiIconWrapper}><TrendingUp size={24} color="#f59e0b" /></div>
              <div>
                <p style={styles.kpiLabel}>ยอดรวมเดือนนี้</p>
                <h2 style={{ ...styles.kpiValue, fontSize: '1.75rem', color: '#f59e0b' }}>{formatMoney(data.totalRevenue)}</h2>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            {/* Recent Quotations */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>ใบเสนอราคาสามรายการล่าสุด</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ดูทั้งหมด <ArrowRight size={16} />
                </button>
              </div>
              
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>เลขที่</th>
                      <th>ลูกค้า</th>
                      <th>วันที่</th>
                      <th style={{ textAlign: 'right' }}>ยอดรวม</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentQuotations || []).map((q, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{q.quotation_no}</td>
                        <td>{q.customer_name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{q.date}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(q.total)}</td>
                        <td>{getStatusBadge(q.status)}</td>
                      </tr>
                    ))}
                    {(!data.recentQuotations || data.recentQuotations.length === 0) && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>ยังไม่มีข้อมูลใบเสนอราคา</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <AlertTriangle size={20} color="var(--danger)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>สินค้าใกล้หมด</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(data.lowStockProducts || []).map((p, i) => (
                  <div key={i} style={styles.alertItem}>
                    <div>
                      <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>รหัส: {p.id}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{p.amount}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>{p.unit}</span>
                    </div>
                  </div>
                ))}
                {(!data.lowStockProducts || data.lowStockProducts.length === 0) && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    ไม่มีสินค้าใกล้หมดสต็อก
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1.5rem',
  },
  kpiIconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-sm)'
  },
  kpiLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: 500,
    marginBottom: '0.25rem'
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1
  },
  kpiUnit: {
    fontSize: '1rem',
    fontWeight: 500,
    color: 'var(--text-muted)'
  },
  alertItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: 'var(--bg-secondary)',
    borderLeft: '4px solid var(--danger)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    boxShadow: 'var(--shadow-sm)'
  }
};
