const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) return;
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app');
files.push(...getFiles('src/components'));
files.push('src/constants/theme.ts');

let count = 0;
for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // Replace Tailwind blue-500 (#3b82f6) with System Primary Blue (#256af4)
    code = code.replace(/#3b82f6/gi, '#256af4');
    code = code.replace(/rgba\(59,\s*130,\s*246/gi, 'rgba(37, 106, 244');
    
    // Also check for #2563eb (another common blue)
    code = code.replace(/#2563eb/gi, '#256af4');
    code = code.replace(/rgba\(37,\s*99,\s*235/gi, 'rgba(37, 106, 244');

    if (code !== original) {
        fs.writeFileSync(file, code);
        count++;
    }
}
console.log('Files updated with exact system blue:', count);
