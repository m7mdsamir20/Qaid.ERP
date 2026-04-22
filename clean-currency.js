const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) return;
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('src\\\\app\\\\reports') && !fullPath.includes('src/app/reports')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app');

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // Remove code={currency} lang={lang} from Currency tags
    code = code.replace(/<Currency amount={([^}]+)}\s+code={currency}\s+lang={lang}\s*\/>/g, '<Currency amount={$1} />');
    
    // Also remove code={currency} and lang={lang} individually just in case
    code = code.replace(/<Currency([^>]+)code={currency}([^>]*)>/g, '<Currency$1$2>');
    code = code.replace(/<Currency([^>]+)lang={lang}([^>]*)>/g, '<Currency$1$2>');

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
