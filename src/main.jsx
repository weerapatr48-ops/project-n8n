import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept all fetch requests to automatically bypass localtunnel warning
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  if (!config) config = {};
  if (!config.headers) config.headers = {};
  
  if (config.headers instanceof Headers) {
    config.headers.set('bypass-tunnel-reminder', 'true');
  } else {
    config.headers['bypass-tunnel-reminder'] = 'true';
  }
  
  return originalFetch(resource, config);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
