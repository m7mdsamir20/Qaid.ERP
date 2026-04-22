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

    // Fix Headers
    code = code.replace(/<th\s+([^>]*style=\{\{\s*(\.\.\.TABLE_STYLE\.th\([^)]*\)),?\s*\}\}\s*)>([\s\S]*?t\(['"](الحالة|Status|إجراءات|Actions|العمليات|إجراء|النوع)['"]\).*?)<\/th>/g, (match, fullStyle, thBase, content) => {
        return `<th ${fullStyle.replace(`{{ ${thBase}, }}`, `{{ ...${thBase}, textAlign: 'center' }}`).replace(`{{ ...${thBase}, }}`, `{{ ...${thBase}, textAlign: 'center' }}`)}>${content}</th>`;
    });

    // Also handle simple TABLE_STYLE.th(false)
    code = code.replace(/<th\s+([^>]*style=\{TABLE_STYLE\.th\([^)]*\)\}[^>]*)>([\s\S]*?t\(['"](الحالة|Status|إجراءات|Actions|العمليات|إجراء|النوع)['"]\).*?)<\/th>/g, (match, props, content) => {
        return `<th ${props.replace(/style=\{([^}]*)\}/, "style={{ ...$1, textAlign: 'center' }}")}>${content}</th>`;
    });

    // Fix Data Cells (Status/Actions)
    // Target: <td style={{ ...TABLE_STYLE.td(false), }}> ... getStatusStyle / actionBtn
    code = code.replace(/<td\s+([^>]*style=\{\{\s*\.\.\.TABLE_STYLE\.td\([^)]*\),?\s*\}\}[^>]*)>([\s\S]*?(getStatusStyle|actionBtn|Printer|Eye|Trash2|CheckCircle2|Clock|AlertCircle).*?)<\/td>/g, (match, fullStyle, content) => {
        if (fullStyle.includes('textAlign: \'center\'') || fullStyle.includes('textAlign: "center"')) return match;
        return `<td ${fullStyle.replace(/style=\{\{\s*(.*?)\s*\}\}/, "style={{ $1 textAlign: 'center' }}").replace(', textAlign', ' textAlign').replace('), textAlign', '), textAlign')}>${content}</td>`;
    });

    // Also handle simple TABLE_STYLE.td(false)
    code = code.replace(/<td\s+([^>]*style=\{TABLE_STYLE\.td\([^)]*\)\}[^>]*)>([\s\S]*?(getStatusStyle|actionBtn|Printer|Eye|Trash2|CheckCircle2|Clock|AlertCircle).*?)<\/td>/g, (match, props, content) => {
        if (props.includes('textAlign: \'center\'')) return match;
        return `<td ${props.replace(/style=\{([^}]*)\}/, "style={{ ...$1, textAlign: 'center' }}")}>${content}</td>`;
    });

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files updated with centered Actions/Status:', count);
