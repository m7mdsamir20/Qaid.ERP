const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) return;
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('src\\\\app\\\\reports') && !fullPath.includes('src/app/reports')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app');

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        // Find <th> elements
        if (lines[i].includes('<th') && lines[i].includes('TABLE_STYLE.th(')) {
            const lowerLine = lines[i].toLowerCase();
            if (lowerLine.includes('رصيد') || lowerLine.includes('مبلغ') || lowerLine.includes('إجمالي') || 
                lowerLine.includes('قيمة') || lowerLine.includes('سعر') || lowerLine.includes('خصم') ||
                lowerLine.includes('ضريبة') || lowerLine.includes('amount') || lowerLine.includes('balance') ||
                lowerLine.includes('total') || lowerLine.includes('price') || lowerLine.includes('cost') ||
                lowerLine.includes('tax') || lowerLine.includes('discount')) {
                // Change .th(false) or .th(true) to .th(false, true) or .th(true, true)
                lines[i] = lines[i].replace(/TABLE_STYLE\.th\((true|false)\)/g, 'TABLE_STYLE.th($1, true)');
            }
        }

        // Find <td> elements containing Currency
        if (lines[i].includes('<td') && lines[i].includes('TABLE_STYLE.td(') && (lines[i].includes('<Currency') || lines[i].includes('fmt('))) {
            lines[i] = lines[i].replace(/TABLE_STYLE\.td\((true|false)\)/g, 'TABLE_STYLE.td($1, true)');
        }
    }
    code = lines.join('\n');

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
