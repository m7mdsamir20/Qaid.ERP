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
const constants = ['C', 'CAIRO', 'OUTFIT', 'INTER', 'THEME', 'SEARCH_STYLE', 'TABLE_STYLE'];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    const usedConstants = constants.filter(c => {
        const regex = new RegExp('\\b' + c + '\\b');
        return regex.test(code) && !new RegExp('import.*\\b' + c + '\\b.*from.*theme').test(code) && !new RegExp('export const ' + c).test(code);
    });

    if (usedConstants.length > 0) {
        // Check if there's already an import from @/constants/theme
        const themeImportRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@\/constants\/theme['"];?/;
        if (themeImportRegex.test(code)) {
            code = code.replace(themeImportRegex, (match, imports) => {
                let items = imports.split(',').map(s => s.trim()).filter(s => s);
                items = [...new Set([...items, ...usedConstants])];
                return `import { ${items.join(', ')} } from '@/constants/theme'`;
            });
        } else {
            // Add new import after 'use client'
            const useClient = /'use client';?\n?| "use client";?\n?/;
            const newImport = `import { ${usedConstants.join(', ')} } from '@/constants/theme';\n`;
            if (useClient.test(code)) {
                code = code.replace(useClient, (match) => match + newImport);
            } else {
                code = newImport + code;
            }
        }
    }

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files fixed for missing imports:', count);
