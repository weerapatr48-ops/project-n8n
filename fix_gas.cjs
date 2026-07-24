const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx') || file.endsWith('.js')) results.push(file);
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // 1. Fix CORS POST issue by changing application/json to text/plain
    if (content.includes("'Content-Type': 'application/json'")) {
        content = content.replace(/'Content-Type': 'application\/json'/g, "'Content-Type': 'text/plain;charset=utf-8'");
        changed = true;
    }

    // 2. Fix CORS GET issue: custom headers like Cache-Control trigger OPTIONS preflight on GAS, which fails.
    if (content.includes("'Cache-Control': 'no-cache'")) {
        content = content.replace(/,\s*headers:\s*\{\s*'Cache-Control':\s*'no-cache'\s*\}/g, '');
        content = content.replace(/headers:\s*\{\s*'Cache-Control':\s*'no-cache'\s*\}\s*,?/g, '');
        changed = true;
    }

    // 3. Fix error messages mentioning n8n
    if (content.includes('n8n')) {
        content = content.replace(/เชื่อมต่อ n8n ไม่ได้/g, 'เชื่อมต่อฐานข้อมูลไม่ได้');
        content = content.replace(/ยังไม่มีข้อมูลใน n8n สำหรับ/g, 'ยังไม่มีข้อมูลในตารางสำหรับ');
        content = content.replace(/n8n RAW RESPONSE/g, 'RAW RESPONSE');
        content = content.replace(/ตรวจสอบ n8n/g, 'ตรวจสอบการเชื่อมต่อ');
        content = content.replace(/n8n /g, 'ฐานข้อมูล ');
        content = content.replace(/n8n/g, 'ฐานข้อมูล');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed', file);
    }
});
