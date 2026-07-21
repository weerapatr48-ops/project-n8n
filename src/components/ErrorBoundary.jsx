import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'var(--danger)', background: 'var(--bg-secondary)', height: '100vh' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>เกิดข้อผิดพลาดในระบบ (System Error)</h2>
          <p>กรุณาแคปเจอร์หน้าจอนี้ส่งให้โปรแกรมเมอร์เพื่อทำการแก้ไขครับ:</p>
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', overflowX: 'auto' }}>
            <p style={{ fontWeight: 'bold', color: 'red' }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ fontSize: '12px', marginTop: '1rem', color: 'var(--text-secondary)' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            รีเฟรชหน้าจอ (Reload Page)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
