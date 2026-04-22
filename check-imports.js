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

const appDir = 'src/app';
const files = getFiles(appDir);

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('fMoneyJSX')) {
        // Check if useCurrency is used and if fMoneyJSX is destructured
        const useCurrencyMatch = content.match(/const\s+\{([^}]+)\}\s*=\s*useCurrency\(\)/);
        if (useCurrencyMatch) {
            const destructured = useCurrencyMatch[1];
            if (!destructured.includes('fMoneyJSX')) {
                console.log(`Missing import in: ${file}`);
            }
        } else if (!content.includes('import { fMoneyJSX }')) {
             // Maybe it's imported another way, but usually it's useCurrency
             if (content.includes('useCurrency')) {
                  console.log(`Potential issue in: ${file} (used fMoneyJSX but useCurrency destructuring not found or malformed)`);
             }
        }
    }
}
