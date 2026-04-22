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
// Also include src/components and src/constants
files.push(...getFiles('src/components'));

let count = 0;
for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // Replace the exact word INTER with OUTFIT
    code = code.replace(/\bINTER\b/g, 'OUTFIT');

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files updated:', count);
