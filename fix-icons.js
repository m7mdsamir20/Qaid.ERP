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
files.push(...getFiles('src/components'));

let count = 0;
for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // Target Lucide icons commonly used for search/date
    const icons = ['Search', 'Calendar', 'ScrollText', 'SearchCode', 'CalendarDays'];
    
    icons.forEach(icon => {
        // Find icons that have a color style and are NOT using C.primary
        // Example: <Search size={16} style={{ ... color: C.textMuted ... }} />
        // Note: We only want to target those in a search/input context, 
        // but the request is to standardize icon colors for better visibility globally for these specific types.
        
        const regex = new RegExp('<' + icon + '([^>]*style={{[^}]*color:\\s*)(C\\.[a-zA-Z]+|[\'"][^\'"]+[\'"])([^}]*})', 'g');
        code = code.replace(regex, (match, p1, p2, p3) => {
            // Check if it's already C.primary
            if (p2 === 'C.primary') return match;
            return '<' + icon + p1 + 'C.primary' + p3;
        });

        // Also handle cases where color is a prop if it exists (though usually it's in style in this project)
        const propRegex = new RegExp('<' + icon + '([^>]*color=)(C\\.[a-zA-Z]+|[\'"][^\'"]+[\'"])', 'g');
        code = code.replace(propRegex, (match, p1, p2) => {
            if (p2 === 'C.primary') return match;
            return '<' + icon + p1 + '{C.primary}';
        });
        
        // Remove opacity if present on these icons to ensure maximum visibility
        code = code.replace(new RegExp('(<' + icon + '[^>]*style={{[^}]*)opacity:\\s*[0-9.]+\\s*,?', 'g'), '$1');
    });

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files updated with standardized icon colors:', count);
