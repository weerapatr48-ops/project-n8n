import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import DatabaseManager from './components/DatabaseManager';
import Settings from './components/Settings';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import QuotationMaker from './components/QuotationMaker';
import QuotationHistory from './components/QuotationHistory';
import StockManager from './components/StockManager';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
function MainApp() {
  const { auth, logout, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [aiQuotationData, setAiQuotationData] = useState(null);
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

        {currentTab === 'quote_maker' && <QuotationMaker aiQuotationData={aiQuotationData} setAiQuotationData={setAiQuotationData} />}
        {currentTab === 'quote_history' && <QuotationHistory setCurrentTab={setCurrentTab} setAiQuotationData={setAiQuotationData} />}

        {currentTab === 'stock' && <StockManager />}

        {currentTab === 'database' && <DatabaseManager />}
        {currentTab === 'ai' && <AIAssistant setCurrentTab={setCurrentTab} setAiQuotationData={setAiQuotationData} />}
        {currentTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <MainApp />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
