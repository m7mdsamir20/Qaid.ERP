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

    // 1. Target Lucide icons for search/date
    const icons = ['Search', 'Calendar', 'ScrollText', 'SearchCode', 'CalendarDays', 'RefreshCw'];
    
    icons.forEach(icon => {
        // Standardize color to C.primary and remove opacity
        // Match <Search ... color: ... /> inside style
        const regex = new RegExp('<' + icon + '([^>]*style={{[^}]*color:\\s*)(C\\.[a-zA-Z]+|[\'"][^\'"]+[\'"]|var\\([^\\)]+\\))([^}]*})', 'g');
        code = code.replace(regex, (match, p1, p2, p3) => {
            return '<' + icon + p1 + 'C.primary' + p3;
        });

        // Match <Search ... color={...} /> as prop
        const propRegex = new RegExp('<' + icon + '([^>]*color={?)(C\\.[a-zA-Z]+|[\'"][^\'"]+[\'"]|var\\([^\\)]+\\))(}?)', 'g');
        code = code.replace(propRegex, (match, p1, p2, p3) => {
            return '<' + icon + p1 + 'C.primary' + p3;
        });
        
        // Ensure no opacity is lowering visibility
        code = code.replace(new RegExp('(<' + icon + '[^>]*style={{[^}]*)opacity:\\s*[0-9.]+\\s*,?', 'g'), '$1');
    });

    // 2. Remove inline <style jsx global> that target date picker indicator
    // This was found in sales/page.tsx and likely others.
    code = code.replace(/<style jsx global>{`[\s\S]*?input\[type="date"\]::-webkit-calendar-picker-indicator[\s\S]*?`}<\/style>/g, '');
    code = code.replace(/<style>{`[\s\S]*?input\[type="date"\]::-webkit-calendar-picker-indicator[\s\S]*?`}<\/style>/g, '');

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files cleaned and standardized:', count);
