import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import DatabaseManager from './components/DatabaseManager';
import Settings from './components/Settings';

function App() {
  const [currentTab, setCurrentTab] = useState('quote');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} isDark={isDark} setIsDark={setIsDark} />
      
      <main className="main-content">
        {currentTab === 'quote' && <AIAssistant />}
        {currentTab === 'database' && <DatabaseManager />}
        {currentTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
