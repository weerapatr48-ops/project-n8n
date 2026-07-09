import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import DatabaseManager from './components/DatabaseManager';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import QuotationMaker from './components/QuotationMaker';
import StockManager from './components/StockManager';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const { auth, logout, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('appTheme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('appTheme', 'light');
    }
  }, [isDark]);

  if (loading) return null;

  if (!auth?.token) {
    return <LoginPage />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        isDark={isDark} 
        setIsDark={setIsDark} 
        user={auth.user}
        onLogout={logout}
      />
      
      <main className="main-content">
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'quote_maker' && <QuotationMaker />}
        {currentTab === 'stock' && <StockManager />}
        {currentTab === 'database' && <DatabaseManager />}
        {currentTab === 'ai' && <AIAssistant />}
        {currentTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
