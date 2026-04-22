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

const reportsDir = 'src/app/reports';
const files = getFiles(reportsDir);

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('fMoneyJSX') && !content.includes('fMoneyJSX } = useCurrency') && !content.includes(', fMoneyJSX } = useCurrency')) {
        console.log(`Missing import in: ${file}`);
    }
}
