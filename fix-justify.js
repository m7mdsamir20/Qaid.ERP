const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app/reports');
let modifiedCount = 0;

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    if (!code.includes('<table')) continue;
    
    let original = code;
    
    const tableRegex = /<table[\s\S]*?<\/table>/g;
    code = code.replace(tableRegex, (tableMatch) => {
        return tableMatch.replace(/justifyContent:\s*['"]center['"]/g, "justifyContent: 'flex-start'");
    });

    if (code !== original) {
        fs.writeFileSync(file, code);
        modifiedCount++;
    }
}
console.log('Modified files with flex-center in tables:', modifiedCount);
