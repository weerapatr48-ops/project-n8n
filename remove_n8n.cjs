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

    // Replace db-write
    if (content.includes('/webhook/db-write')) {
        content = content.replace(/fetch\(`\$\{[^}]+\}\/webhook\/db-write`/g, 'fetch(GAS_URL');
        changed = true;
    }
    
    // Replace db-read
    if (content.includes('/webhook/db-read')) {
        content = content.replace(/fetch\(`\$\{[^}]+\}\/webhook\/db-read\?sheet=([^`&]+)[^`]*`/g, 'fetch(`\\${GAS_URL}?sheet=$1&t=\\${Date.now()}`');
        changed = true;
    }

    // Replace dashboard
    if (content.includes('/webhook/dashboard')) {
        content = content.replace(/fetch\(`\$\{[^}]+\}\/webhook\/dashboard`/g, 'fetch(`\\${GAS_URL}?sheet=Dashboard`');
        changed = true;
    }

    // Insert GAS_URL import if we just added GAS_URL
    if (changed && !content.includes('GAS_URL')) {
        // calculate relative path to DataContext.jsx
        let relPath = path.relative(path.dirname(file), path.join(srcDir, 'context', 'DataContext.jsx')).replace(/\\/g, '/');
        if (!relPath.startsWith('.')) relPath = './' + relPath;
        // remove extension
        relPath = relPath.replace('.jsx', '');
        
        const lines = content.split('\n');
        const lastImportIndex = lines.map(l => l.startsWith('import ')).lastIndexOf(true);
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, `import { GAS_URL } from '${relPath}';`);
            content = lines.join('\n');
        } else {
            content = `import { GAS_URL } from '${relPath}';\n` + content;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated DB hooks in', file);
    }
});
