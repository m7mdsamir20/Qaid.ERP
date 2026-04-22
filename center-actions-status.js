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

    // 1. Center headers for Status and Actions
    // Common labels for Status: الحالة, Status, النوع (sometimes Type acts as status)
    // Common labels for Actions: إجراءات, Actions, العمليات, إجراء
    const headerLabels = ['الحالة', 'Status', 'إجراءات', 'Actions', 'العمليات', 'إجراء', 'النوع'];
    
    // Regex to find <th> containing one of the labels
    const thRegex = /<th\s+([^>]*style=\{([^}]*)\}[^>]*)>([\s\S]*?t\(['"](الحالة|Status|إجراءات|Actions|العمليات|إجراء|النوع)['"]\).*?)<\/th>/g;

    code = code.replace(thRegex, (match, props, style, content) => {
        if (style.includes('textAlign: \'center\'') || style.includes('textAlign: "center"')) return match;
        
        let newStyle;
        if (style.trim().startsWith('{')) {
            newStyle = style.replace(/\}\s*$/, ", textAlign: 'center' }");
        } else if (style.includes('TABLE_STYLE.th')) {
            newStyle = `{ ...${style}, textAlign: 'center' }`;
        } else {
            return match; // Skip if we can't easily parse style
        }
        return `<th ${props.replace(`style={${style}}`, `style={${newStyle}}`)}>${content}</th>`;
    });

    // 2. Center Status TD
    // Look for TD containing getStatusStyle or status badges
    const tdRegex = /<td\s+([^>]*style=\{([^}]*)\}[^>]*)>([\s\S]*?(getStatusStyle|status-badge|borderRadius: '30px'|st\.bg|actionBtn|justifyContent: 'center'|Printer|Eye|Trash2|Edit|Plus|ChevronDown).*?)<\/td>/g;
    
    code = code.replace(tdRegex, (match, props, style, content) => {
        // If it already has center alignment, skip
        if (style.includes('textAlign: \'center\'') || style.includes('textAlign: "center"')) return match;
        
        // We only want to target Status (badges) or Actions (buttons)
        const isStatus = content.includes('getStatusStyle') || content.includes('borderRadius: \'30px\'') || content.includes('st.bg') || content.includes('CheckCircle2') || content.includes('Clock') || content.includes('AlertCircle');
        const isActions = content.includes('actionBtn') || content.includes('TABLE_STYLE.actionBtn') || content.includes('justifyContent: \'center\'') || content.includes('justifyContent: "center"');
        
        if (!isStatus && !isActions) return match;

        let newStyle;
        if (style.trim().startsWith('{')) {
            newStyle = style.replace(/\}\s*$/, ", textAlign: 'center' }");
        } else if (style.includes('TABLE_STYLE.td')) {
            newStyle = `{ ...${style}, textAlign: 'center' }`;
        } else {
            newStyle = `{ textAlign: 'center' }`; // Fallback if style was just a constant
        }
        
        return `<td ${props.replace(`style={${style}}`, `style={${newStyle}}`)}>${content}</td>`;
    });

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files updated with centered Actions/Status:', count);
