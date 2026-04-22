const fs = require('fs');
const path = require('path');

const targetHeaders = [
    'الرصيد الحالي', 'Current Balance',
    'طريقة الدفع', 'Payment Method',
    'الحالة', 'Status',
    'إجراء', 'إجراءات', 'العمليات', 'Actions', 'Action'
];

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) return;
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Array-based headers in map
    // Target any .map(...) that contains our target headers
    const mapRegex = /\[\s*([^\]]*?(?:الرصيد الحالي|طريقة الدفع|الحالة|إجراءات|إجراء|Actions)[^\]]*?)\s*\]\.map\(\s*\(([^,)]+),\s*([^)]+)\)\s*=>\s*([\s\S]*?<\s*th[\s\S]*?<\s*\/th>[\s\S]*?)\)/g;
    
    content = content.replace(mapRegex, (match, items, labelVar, indexVar, body) => {
        const labels = items.split(',').map(s => s.trim());
        const centerIndices = [];
        labels.forEach((l, idx) => {
            if (targetHeaders.some(h => l.includes(h))) {
                centerIndices.push(idx);
            }
        });

        if (centerIndices.length > 0) {
            const indicesStr = centerIndices.length === 1 ? `${indexVar} === ${centerIndices[0]}` : `[${centerIndices.join(', ')}].includes(${indexVar})`;
            
            // Try to add textAlign: 'center' to the style object in the body
            if (body.includes('style={{')) {
                return match.replace(body, body.replace(/style=\{\{\s*/, `style={{ textAlign: ${indicesStr} ? 'center' : 'start', `));
            } else if (body.includes('style={TABLE_STYLE.th')) {
                return match.replace(body, body.replace(/TABLE_STYLE\.th\(([^,)]+)\)/, `TABLE_STYLE.th($1, ${indicesStr})`));
            }
        }
        return match;
    });

    // 2. Individual <th> and <td> elements containing specific text
    for (const h of targetHeaders) {
        // Individual <th>
        const thRegex = new RegExp(`<th([^>]*)>([^<]*(?:t\\(['"]${h}['"]\\)|['"]${h}['"]|${h})[^<]*)<\\/th>`, 'g');
        content = content.replace(thRegex, (match, attr, label) => {
            if (match.includes('textAlign') || match.includes('true')) return match;
            if (attr.includes('style={{')) {
                return `<th${attr.replace(/style=\{\{\s*/, "style={{ textAlign: 'center', ")}>${label}</th>`;
            } else if (attr.includes('style={TABLE_STYLE.th')) {
                return `<th${attr.replace(/TABLE_STYLE\.th\(([^,)]+)\)/, "TABLE_STYLE.th($1, true)")}>${label}</th>`;
            } else {
                return `<th${attr} style={{ textAlign: 'center' }}>${label}</th>`;
            }
        });

        // Corresponding <td> with badges or buttons (heuristic)
        // If it contains t('نقدي') or similar markers
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
    }
}
console.log('Center alignment v3 (aggressive) complete.');
