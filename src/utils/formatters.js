export const THBText = (number) => {
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

export const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded);
};
