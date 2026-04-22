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

    // Clean up excessive dots
    code = code.replace(/\.\.\.\.\.\./g, '...');
    code = code.replace(/\.\.\.\.\./g, '...');
    
    const lines = code.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Target TH for Status/Actions
        if (line.includes('<th') && line.includes('t(') && (
            line.includes('"الحالة"') || line.includes("'الحالة'") ||
            line.includes('"Status"') || line.includes("'Status'") ||
            line.includes('"إجراءات"') || line.includes("'إجراءات'") ||
            line.includes('"Actions"') || line.includes("'Actions'") ||
            line.includes('"العمليات"') || line.includes("'العمليات'")
        )) {
            // Apply textAlign: center
            if (!line.includes("textAlign: 'center'")) {
                line = line.replace(/style=\{TABLE_STYLE\.th\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.th($1), textAlign: 'center' }}");
                line = line.replace(/style=\{\{\s*(.*?)\s*\}\}/, (match, inner) => {
                    if (inner.includes('TABLE_STYLE.th')) {
                        return `style={{ ${inner.trim().endsWith(',') ? inner : inner + ','} textAlign: 'center' }}`;
                    }
                    return match;
                });
            }
        }
        
        // Target TD for Status (badges)
        if (line.includes('<td') && (line.includes('getStatusStyle') || line.includes('st.bg') || line.includes('CheckCircle2') || line.includes('Clock') || line.includes('AlertCircle'))) {
             if (!line.includes("textAlign: 'center'")) {
                line = line.replace(/style=\{TABLE_STYLE\.td\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.td($1), textAlign: 'center' }}");
                line = line.replace(/style=\{\{\s*(.*?)\s*\}\}/, (match, inner) => {
                    if (inner.includes('TABLE_STYLE.td')) {
                        return `style={{ ${inner.trim().endsWith(',') ? inner : inner + ','} textAlign: 'center' }}`;
                    }
                    return match;
                });
            }
        }

        // Target TD for Actions (buttons)
        // Check current line and next few lines for action buttons
        let isActionTd = line.includes('<td') && (line.includes('actionBtn') || line.includes('Printer') || line.includes('Eye') || line.includes('Trash2') || line.includes('Edit'));
        
        // If not on same line, check next line
        if (!isActionTd && line.includes('<td') && i + 1 < lines.length) {
            const nextLine = lines[i+1];
            if (nextLine.includes('actionBtn') || nextLine.includes('justifyContent: \'center\'') || nextLine.includes('Printer') || nextLine.includes('Eye')) {
                isActionTd = true;
            }
        }

        if (isActionTd) {
            if (!line.includes("textAlign: 'center'")) {
                line = line.replace(/style=\{TABLE_STYLE\.td\(([^)]*)\)\}/, "style={{ ...TABLE_STYLE.td($1), textAlign: 'center' }}");
                line = line.replace(/style=\{\{\s*(.*?)\s*\}\}/, (match, inner) => {
                    if (inner.includes('TABLE_STYLE.td')) {
                        return `style={{ ${inner.trim().endsWith(',') ? inner : inner + ','} textAlign: 'center' }}`;
                    }
                    return match;
                });
            }
        }

        newLines.push(line);
    }

    code = newLines.join('\n');

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
console.log('Final pass completed.');
