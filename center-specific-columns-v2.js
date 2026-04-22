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
            const indicesStr = centerIndices.length === 1 ? `${indexVar} === ${centerIndices[0]}` : `[${centerIndices.join(', ')}].includes(${indexVar})`;
            return match.replace(/TABLE_STYLE\.th\(([^,)]+)\)/, `TABLE_STYLE.th($1, ${indicesStr})`);
        }
        return match;
    });

    // 2. Target individual <th> elements (more flexible regex)
    for (const h of targetHeaders) {
        // Match <th style={TABLE_STYLE.th(false)}>طريقة الدفع</th> or {t('طريقة الدفع')}
        const thRegex = new RegExp(`<th([^>]*)style=\\{\\s*(?:\\{\\s*\\.\\.\\.\\s*)?TABLE_STYLE\\.th\\(([^,)]+)\\)\\s*\\}?\\s*\\}>([^<]*(?:t\\(['"]${h}['"]\\)|['"]${h}['"]|${h})[^<]*)<\\/th>`, 'g');
        content = content.replace(thRegex, (match, attr, isFirst, label) => {
            if (match.includes('true')) return match;
            return `<th${attr}style={TABLE_STYLE.th(${isFirst}, true)}>${label}</th>`;
        });
    }

    // 3. Target corresponding <td> elements
    const actionTdRegex = /<td([^>]*)style=\{\s*(?:\{\s*\.\.\.\s*)?TABLE_STYLE\.td\(([^,)]+)\)\s*\}?\s*\}>([\s\S]*?(?:TABLE_STYLE\.actionBtn|<button[^>]*>[\s\S]*?(?:Eye|Trash|Edit|Trash2|Edit3|Printer)[\s\S]*?<\/button>|<Printer[^>]*\/>)[\s\S]*?)<\/td>/g;
    content = content.replace(actionTdRegex, (match, attr, isFirst, inner) => {
        if (match.includes('textAlign: "center"') || match.includes("textAlign: 'center'") || match.includes('true')) return match;
        return `<td${attr}style={TABLE_STYLE.td(${isFirst}, true)}>${inner}</td>`;
    });

    const statusTdRegex = /<td([^>]*)style=\{\s*(?:\{\s*\.\.\.\s*)?TABLE_STYLE\.td\(([^,)]+)\)\s*\}?\s*\}>([\s\S]*?(?:getStatusStyle|status ===|balance <|paymentType ===|'نقدي'|"نقدي"|'آجل'|"آجل"|'بنكي'|"بنكي")[\s\S]*?)<\/td>/g;
    content = content.replace(statusTdRegex, (match, attr, isFirst, inner) => {
        if (match.includes('textAlign: "center"') || match.includes("textAlign: 'center'") || match.includes('true')) return match;
        return `<td${attr}style={TABLE_STYLE.td(${isFirst}, true)}>${inner}</td>`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
    }
}
console.log('Center alignment v2 complete.');
