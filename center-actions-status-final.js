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

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // 1. First, strip ALL textAlign: 'center' from TABLE_STYLE.th/td to start fresh
    code = code.replace(/,\s*textAlign:\s*['"]center['"]/g, '');
    code = code.replace(/textAlign:\s*['"]center['"],?\s*/g, '');
    
    // Clean up empty style objects like style={{ ...TABLE_STYLE.th(true) }}
    // (Ensure there's no trailing comma left)
    code = code.replace(/\{\s*(\.\.\.TABLE_STYLE\.[^,}]*),\s*\}/g, '{$1}');

    const lines = code.split('\n');
    const newLines = [];
    
    const statusLabels = ['"الحالة"', "'الحالة'", '"Status"', "'Status'"];
    const actionLabels = ['"إجراءات"', "'إجراءات'", '"Actions"', "'Actions'", '"العمليات"', "'العمليات'", '"إجراء"', "'إجراء'"];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Match TH for Status/Actions precisely
        const isStatusTh = line.includes('<th') && statusLabels.some(l => line.includes(l));
        const isActionTh = line.includes('<th') && actionLabels.some(l => line.includes(l));

        if (isStatusTh || isActionTh) {
            // Apply textAlign: center
            line = line.replace(/style=\{TABLE_STYLE\.th\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.th($1), textAlign: 'center' }}");
            line = line.replace(/style=\{\{\s*(\.\.\.TABLE_STYLE\.th\([^)]*\))\s*\}\}/, "style={{ $1, textAlign: 'center' }}");
        }
        
        // Match TD for Status (badges)
        const isStatusTd = line.includes('<td') && (line.includes('getStatusStyle') || line.includes('st.bg') || line.includes('CheckCircle2'));
        
        // Match TD for Actions (buttons)
        let isActionTd = line.includes('<td') && (line.includes('actionBtn') || line.includes('TABLE_STYLE.actionBtn'));
        if (!isActionTd && line.includes('<td') && i + 1 < lines.length) {
            const nextLine = lines[i+1];
            if (nextLine.includes('actionBtn') || nextLine.includes('Printer') || nextLine.includes('Eye')) {
                isActionTd = true;
            }
        }

        if (isStatusTd || isActionTd) {
            line = line.replace(/style=\{TABLE_STYLE\.td\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.td($1), textAlign: 'center' }}");
            line = line.replace(/style=\{\{\s*(\.\.\.TABLE_STYLE\.td\([^)]*\))\s*\}\}/, "style={{ $1, textAlign: 'center' }}");
        }

        newLines.push(line);
    }

    code = newLines.join('\n');

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
console.log('Precise alignment fix completed.');
