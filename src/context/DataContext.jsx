import React, { createContext, useContext, useState, useEffect } from 'react';

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbw6zTz095TRtg3F6h48tk111oDA5Cyxt6bF6y9OOFhS5Mtyz2YUufUqXVcekhjrhcRZ/exec';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [salesPRHeader, setSalesPRHeader] = useState([]);
  const [salesPRBody, setSalesPRBody] = useState([]);
  const [settings, setSettings] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const getSettings = () => JSON.parse(localStorage.getItem('appSettings') || '{}');

  const fetchAllData = async () => {
    try {
      const s = getSettings();
      const ฐานข้อมูลUrl = s.ฐานข้อมูลUrl || '';
      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      
      // เราใช้ Promise.all เพื่อยิง API ทั้งหมดพร้อมกันไปยัง Google Apps Script (GAS)
      const [custRes, empRes, prodRes, setRes, stockRes, headerRes, bodyRes] = await Promise.all([
        fetch(`${GAS_URL}?sheet=customer&t=${Date.now()}`).catch(() => null),
        fetch(`${GAS_URL}?sheet=empolyee&t=${Date.now()}`).catch(() => null),
        fetch(`${GAS_URL}?sheet=product&t=${Date.now()}`).catch(() => null),
        fetch(`${GAS_URL}?sheet=Settings&t=${Date.now()}`).catch(() => null),
        fetch(`${GAS_URL}?sheet=stock&t=${Date.now()}`).catch(() => null),
        fetch(`${GAS_URL}?sheet=sales_pr_header&t=${Date.now()}`).catch(() => null),
        fetch(`${GAS_URL}?sheet=sales_pr_body&t=${Date.now()}`).catch(() => null)
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
          if (result.length > 0 && result[0]?.json) {
            rawData = result.map((item, index) => ({
              ...item.json,
              _rawRowNumber: item.row_number || item.rowNumber || index + 2
            }));
          } else {
            rawData = result;
          }
        } else if (typeof result === 'object' && !result.error) {
          const keys = Object.keys(result);
          if (keys.length > 0 && keys.every(k => !isNaN(k))) rawData = keys.map(k => result[k]);
          else if (Array.isArray(result.data)) rawData = result.data;
          else rawData = [result];
        }
        
        // Add _rawRowNumber so updates can find the right row in Google Sheets
        const mappedData = rawData.map((row, index) => {
          return { ...row, _rawRowNumber: row._rawRowNumber || row.row_number || row.rowNumber || index + 2 };
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

      if (headerRes && headerRes.ok) {
        setSalesPRHeader(parseN8nData(await safeJson(headerRes)));
      }

      if (bodyRes && bodyRes.ok) {
        setSalesPRBody(parseN8nData(await safeJson(bodyRes)));
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
    
    // ตั้งเวลาให้ดึงข้อมูลใหม่ทุกๆ 30 วินาที (Auto-refresh)
    const intervalId = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, []);

  const refreshData = () => fetchAllData();

  return (
    <DataContext.Provider value={{ customers, employees, products, stockData, salesPRHeader, salesPRBody, settings, isDataLoaded, refreshData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
