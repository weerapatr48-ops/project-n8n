import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const getSettings = () => JSON.parse(localStorage.getItem('appSettings') || '{}');

  const fetchAllData = async () => {
    try {
      const s = getSettings();
      const n8nUrl = s.n8nUrl || '';
      const localProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
      
      // เราใช้ Promise.all เพื่อยิง API ทั้ง 4 ตัวพร้อมกัน
      const [custRes, empRes, prodRes, setRes] = await Promise.all([
        fetch(`${n8nUrl}/webhook/db-read?sheet=customer&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=empolyee&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/db-read?sheet=product&t=${Date.now()}`).catch(() => null),
        fetch(`${n8nUrl}/webhook/settings?t=${Date.now()}`).catch(() => null)
      ]);

      const filterEmpty = (arr) => arr.filter(row => {
        return Object.entries(row).some(([k, v]) => 
          !['row_number', 'rowNumber'].includes(k) && !k.startsWith('_') && v !== null && v !== undefined && String(v).trim() !== ''
        );
      });

      if (custRes && custRes.ok) {
        const cData = await custRes.json();
        if (Array.isArray(cData)) setCustomers(filterEmpty(cData));
      }

      if (empRes && empRes.ok) {
        const eData = await empRes.json();
        if (Array.isArray(eData)) setEmployees(filterEmpty(eData));
      }

      if (prodRes && prodRes.ok) {
        const pData = await prodRes.json();
        if (Array.isArray(pData)) setProducts(filterEmpty(pData));
      }

      let newSettings = { ...localProfile };
      if (setRes && setRes.ok) {
        const result = await setRes.json();
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
    <DataContext.Provider value={{ customers, employees, products, settings, isDataLoaded, refreshData }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
