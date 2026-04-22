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

    // 1. Reset
    code = code.replace(/,\s*textAlign:\s*['"]center['"]/g, '');
    code = code.replace(/textAlign:\s*['"]center['"],?\s*/g, '');
    code = code.replace(/\{\s*(\.\.\.TABLE_STYLE\.[^,}]*),\s*\}/g, '{$1}');

    const lines = code.split('\n');
    const newLines = [];
    
    const statusLabels = ['"الحالة"', "'الحالة'", '"Status"', "'Status'"];
    const actionLabels = ['"إجراءات"', "'إجراءات'", '"Actions"', "'Actions'", '"العمليات"', "'العمليات'", '"إجراء"', "'إجراء'"];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Match TH
        const isStatusTh = line.includes('<th') && statusLabels.some(l => line.includes(l));
        const isActionTh = line.includes('<th') && actionLabels.some(l => line.includes(l));

        if (isStatusTh || isActionTh) {
            line = line.replace(/style=\{TABLE_STYLE\.th\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.th($1), textAlign: 'center' }}");
            line = line.replace(/style=\{\{\s*(\.\.\.TABLE_STYLE\.th\([^)]*\))\s*\}\}/, "style={{ $1, textAlign: 'center' }}");
        }
        
        // Match TD
        if (line.includes('<td')) {
            let isTargetTd = false;
            // Check current line and next 5 lines for indicators
            for (let j = 0; j <= 6; j++) {
                if (i + j >= lines.length) break;
                const checkLine = lines[i + j];
                
                // Indicators for Status
                if (checkLine.includes('getStatusStyle') || checkLine.includes('st.bg') || checkLine.includes('CheckCircle2') || checkLine.includes('Clock') || checkLine.includes('AlertCircle') || checkLine.includes('borderRadius: \'30px\'')) {
                    isTargetTd = true;
                    break;
                }
                
                // Indicators for Actions
                if (checkLine.includes('actionBtn') || checkLine.includes('TABLE_STYLE.actionBtn') || (checkLine.includes('justifyContent') && checkLine.includes('center')) || checkLine.includes('Printer') || checkLine.includes('Eye') || checkLine.includes('Trash2')) {
                    isTargetTd = true;
                    break;
                }

                // If we hit another <td> or </td> before finding indicators, stop (but be careful with nested tags)
                if (j > 0 && checkLine.includes('<td')) break; 
            }

            if (isTargetTd) {
                line = line.replace(/style=\{TABLE_STYLE\.td\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.td($1), textAlign: 'center' }}");
                line = line.replace(/style=\{\{\s*(\.\.\.TABLE_STYLE\.td\([^)]*\))\s*\}\}/, "style={{ $1, textAlign: 'center' }}");
            }
        }

        newLines.push(line);
    }

    code = newLines.join('\n');

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
console.log('Global centering for Actions/Status completed.');
