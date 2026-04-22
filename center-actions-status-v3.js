const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) return;
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app');

let count = 0;

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // Clean up excessive dots first
    code = code.replace(/\.\.\.\.\.\./g, '...');
    code = code.replace(/\.\.\.\.\.\.\.\.\./g, '...');
    
    // 1. Fix Headers (Status and Actions only)
    const thRegex = /<th\s+([^>]*style=\{\{\s*(\.\.\.)?TABLE_STYLE\.th\(([^)]*)\),?\s*\}\}\s*)>([\s\S]*?t\(['"](الحالة|Status|إجراءات|Actions|العمليات|إجراء)['"]\).*?)<\/th>/g;

    code = code.replace(thRegex, (match, fullStyle, dots, args, content) => {
        return `<th style={{ ...TABLE_STYLE.th(${args}), textAlign: 'center' }}>${content}</th>`;
    });

    // Handle simple TABLE_STYLE.th(false)
    code = code.replace(/<th\s+([^>]*style=\{TABLE_STYLE\.th\(([^)]*)\)\}[^>]*)>([\s\S]*?t\(['"](الحالة|Status|إجراءات|Actions|العمليات|إجراء)['"]\).*?)<\/th>/g, (match, props, args, content) => {
        return `<th style={{ ...TABLE_STYLE.th(${args}), textAlign: 'center' }}>${content}</th>`;
    });

    // 2. Fix Data Cells (Status/Actions)
    // Target cells containing getStatusStyle or action buttons
    const tdStatusRegex = /<td\s+([^>]*style=\{\{\s*(\.\.\.)?TABLE_STYLE\.td\(([^)]*)\),?\s*\}\}[^>]*)>([\s\S]*?(getStatusStyle|CheckCircle2|Clock|AlertCircle).*?)<\/td>/g;
    code = code.replace(tdStatusRegex, (match, fullStyle, dots, args, content) => {
        return `<td style={{ ...TABLE_STYLE.td(${args}), textAlign: 'center' }}>${content}</td>`;
    });

    const tdActionRegex = /<td\s+([^>]*style=\{(\{\s*(\.\.\.)?TABLE_STYLE\.td\(([^)]*)\),?\s*\}|TABLE_STYLE\.td\(([^)]*)\))\}\s*)>([\s\S]*?(actionBtn|TABLE_STYLE\.actionBtn|Printer|Eye|Trash2|Edit|Plus).*?)<\/td>/g;
    code = code.replace(tdActionRegex, (match, fullStyle, innerStyle, dots, args1, args2, content) => {
        const args = args1 || args2;
        return `<td style={{ ...TABLE_STYLE.td(${args}), textAlign: 'center' }}>${content}</td>`;
    });

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files cleaned and updated:', count);
