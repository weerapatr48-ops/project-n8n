import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [stockLogs, setStockLogs] = useState([]);
  const [salesSO, setSalesSO] = useState([]);
  const [subSalesSO, setSubSalesSO] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [settings, setSettings] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const getSettings = () => JSON.parse(localStorage.getItem('appSettings') || '{}');

  const fetchAllData = async () => {
    try {
      const s = getSettings();
      const n8nUrl = s.n8nUrl || '';
      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      
      // เราใช้ Promise.all เพื่อยิง API ทั้งหมดพร้อมกัน
      const [custRes, empRes, prodRes, pipeRes, setRes, stockRes, logRes, soRes, subSoRes] = await Promise.all([
        fetch(`${n8nUrl}/webhook/db-read?sheet=customer&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=empolyee&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=product&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=pipeline&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/settings?t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=stock&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=Stock_Log&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=sales_so&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=sub_sales_so&t=${Date.now()}`).catch(() => null)
      ]);

      const safeJson = async (res) => {
        if (!res) return null;
        try {
          const text = await res.text();
          return text && text.trim() ? JSON.parse(text) : null;
        } catch (e) {
          console.warn("Error parsing JSON from response:", e);
          return null;
        }
      };

      const parseN8nData = (result) => {
        if (!result) return [];
        let rawData = [];
        if (Array.isArray(result)) {
          if (result.length > 0 && result[0]?.json) rawData = result.map(item => item.json);
          else rawData = result;
        } else if (typeof result === 'object' && !result.error) {
          const keys = Object.keys(result);
          if (keys.length > 0 && keys.every(k => !isNaN(k))) rawData = keys.map(k => result[k]);
          else if (Array.isArray(result.data)) rawData = result.data;
          else rawData = [result];
        }
        
        // Add _rawRowNumber so updates can find the right row in Google Sheets
        const mappedData = rawData.map((row, index) => {
          return { ...row, _rawRowNumber: row.row_number || row.rowNumber || index + 2 };
        });

        return filterEmpty(mappedData);
      };

      const filterEmpty = (arr) => arr.filter(row => {
        return Object.entries(row).some(([k, v]) => 
          !['row_number', 'rowNumber'].includes(k) && !k.startsWith('_') && v !== null && v !== undefined && String(v).trim() !== ''
        );
      });

      if (custRes && custRes.ok) {
        setCustomers(parseN8nData(await safeJson(custRes)));
      }

      if (empRes && empRes.ok) {
        setEmployees(parseN8nData(await safeJson(empRes)));
      }

      if (prodRes && prodRes.ok) {
        setProducts(parseN8nData(await safeJson(prodRes)));
      }

      if (stockRes && stockRes.ok) {
        setStockData(parseN8nData(await safeJson(stockRes)));
      }

      if (logRes && logRes.ok) {
        setStockLogs(parseN8nData(await safeJson(logRes)));
      }

      if (soRes && soRes.ok) {
        setSalesSO(parseN8nData(await safeJson(soRes)));
      }

      if (subSoRes && subSoRes.ok) {
        setSubSalesSO(parseN8nData(await safeJson(subSoRes)));
      }

      if (pipeRes && pipeRes.ok) {
        setPipelineData(parseN8nData(await safeJson(pipeRes)));
      }

      let newSettings = { ...localProfile };
      if (setRes && setRes.ok) {
        const result = await safeJson(setRes);
        const sData = Array.isArray(result) && result[0]?.json ? result[0].json : (Array.isArray(result) ? result[0] : result);
        if (sData) {
          newSettings = {
            companyName: sData['Company Name'] || sData.companyName || localProfile.companyName || '',
            companyTaxId: sData['Tax ID'] || sData.companyTaxId || localProfile.companyTaxId || '',
            companyAddress: sData['Address'] || sData.companyAddress || localProfile.companyAddress || '',
            companyPhone: sData['Phone'] || sData.companyPhone || localProfile.companyPhone || '',
            companyLogo: sData['Logo URL'] || sData.companyLogo || localProfile.companyLogo || ''
          };
        }
      }
      setSettings(newSettings);
      setIsDataLoaded(true);
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line
  }, []);

  const refreshData = () => fetchAllData();

  return (
    <DataContext.Provider value={{ customers, employees, products, stockData, stockLogs, salesSO, subSalesSO, pipelineData, settings, isDataLoaded, refreshData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
