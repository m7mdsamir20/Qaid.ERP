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

    // 1. Target Headers in arrays (map blocks)
    // Example: {[t('الخطة'), t('الحالة')].map((h, i) => ...)}
    const headerMapRegex = /\{\s*\[([^\]]+)\]\.map\(\s*\(([^,)]+),\s*([^)]+)\)\s*=>\s*\(\s*<th[^>]*>\{[^}]+\}<\/th>\s*\)\s*\)\s*\}/g;
    
    content = content.replace(headerMapRegex, (match, items, labelVar, indexVar) => {
        const labels = items.split(',').map(s => s.trim());
        const centerIndices = [];
        labels.forEach((l, idx) => {
            if (targetHeaders.some(h => l.includes(`'${h}'`) || l.includes(`"${h}"`) || l.includes(`t('${h}')`) || l.includes(`t("${h}")`))) {
                centerIndices.push(idx);
            }
        });

        if (centerIndices.length > 0) {
            // Replace <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
            // with <th key={i} style={TABLE_STYLE.th(i === 0, [indices].includes(i))}>{h}</th>
            const indicesStr = centerIndices.length === 1 ? centerIndices[0] : `[${centerIndices.join(', ')}].includes(${indexVar})`;
            return match.replace(/TABLE_STYLE\.th\(([^,)]+)\)/, `TABLE_STYLE.th($1, ${centerIndices.length === 1 ? `${indexVar} === ${centerIndices[0]}` : `[${centerIndices.join(', ')}].includes(${indexVar})`})`);
        }
        return match;
    });

    // 2. Target individual <th> elements
    // Example: <th style={TABLE_STYLE.th(false)}>{t('طريقة الدفع')}</th>
    for (const h of targetHeaders) {
        const thRegex = new RegExp(`<th([^>]*)style=\\{\\s*(?:\\{\\s*\\.\\.\\.\\s*)?TABLE_STYLE\\.th\\(([^,)]+)\\)\\s*\\}?\\s*\\}>([^<]*\\{(?:t\\(['"]${h}['"]\\)|['"]${h}['"])\\}[^<]*)<\\/th>`, 'g');
        content = content.replace(thRegex, (match, attr, isFirst, label) => {
            return `<th${attr}style={TABLE_STYLE.th(${isFirst}, true)}>${label}</th>`;
        });
    }

    // 3. Target corresponding <td> elements
    // This is hard because it depends on the column index.
    // However, many files use explicit markers like badges or action buttons.
    
    // Actions TD replacement (usually contains actionBtn or Eye/Trash icons)
    const actionTdRegex = /<td([^>]*)style=\{\s*(?:\{\s*\.\.\.\s*)?TABLE_STYLE\.td\(([^,)]+)\)\s*\}?\s*\}>([\s\S]*?(?:TABLE_STYLE\.actionBtn|<button[^>]*>[\s\S]*?(?:Eye|Trash|Edit|Trash2|Edit3)[\s\S]*?<\/button>)[\s\S]*?)<\/td>/g;
    content = content.replace(actionTdRegex, (match, attr, isFirst, inner) => {
        if (match.includes('textAlign: "center"') || match.includes("textAlign: 'center'")) return match;
        return `<td${attr}style={TABLE_STYLE.td(${isFirst}, true)}>${inner}</td>`;
    });

    // Status/Payment Method TD replacement (usually contains a span with background/border like a badge)
    // We look for <td> elements containing badges or specific text
    const badgeTdRegex = /<td([^>]*)style=\{\s*(?:\{\s*\.\.\.\s*)?TABLE_STYLE\.td\(([^,)]+)\)\s*\}?\s*\}>([\s\S]*?<span[^>]*style=\{\s*\{[\s\S]*?(?:background|borderRadius|border)[\s\S]*?\}>[\s\S]*?<\/td>)/g;
    // This is a bit broad, let's refine.
    
    // Better: Target <td> that contains {c.balance...}, {inst.status...}, etc. and has a badge-like appearance
    const statusTdRegex = /<td([^>]*)style=\{\s*(?:\{\s*\.\.\.\s*)?TABLE_STYLE\.td\(([^,)]+)\)\s*\}?\s*\}>([\s\S]*?(?:getStatusStyle|status ===|balance <|paymentType ===|'نقدي'|"نقدي"|'آجل'|"آجل")[\s\S]*?)<\/td>/g;
    content = content.replace(statusTdRegex, (match, attr, isFirst, inner) => {
        if (match.includes('textAlign: "center"') || match.includes("textAlign: 'center'")) return match;
        return `<td${attr}style={TABLE_STYLE.td(${isFirst}, true)}>${inner}</td>`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
    }
}
console.log('Center alignment for Status/Actions/Balance/Payment complete.');
