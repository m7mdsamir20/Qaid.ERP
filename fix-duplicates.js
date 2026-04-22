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

    // Fix duplicate OUTFIT imports
    // Sometimes they might be separated by other imports like: OUTFIT, KPI_STYLE, OUTFIT
    // Easiest is to use regex on the import statements.
    
    // For every import statement, get the destructured parts and unique them
    code = code.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, from) => {
        let items = imports.split(',').map(s => s.trim()).filter(s => s);
        items = [...new Set(items)]; // unique
        return `import { ${items.join(', ')} } from '${from}'`;
    });

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files fixed for duplicates:', count);
