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

    // Fix currency replacements using a better regex that allows nested parentheses
    // Matches {fmt(...)} <span...>{sym}</span>
    const currencyRegex1 = /\{fmt\((.*?)\)\}\s*<span[^>]*>\{?(sym|cSymbol|currencyName|getCurrencyName\(currency\))\}?<\/span>/g;
    code = code.replace(currencyRegex1, '<Currency amount={$1} code={currency} lang={lang} />');

    const currencyRegex2 = /<span>\{fmt\((.*?)\)\}<\/span>\s*<small[^>]*>\{?(sym|cSymbol|currencyName|getCurrencyName\(currency\))\}?<\/small>/g;
    code = code.replace(currencyRegex2, '<Currency amount={$1} code={currency} lang={lang} />');
    
    const currencyRegex3 = /\{fmt\((.*?)\)\}\s*<small[^>]*>\{?(sym|cSymbol|currencyName|getCurrencyName\(currency\))\}?<\/small>/g;
    code = code.replace(currencyRegex3, '<Currency amount={$1} code={currency} lang={lang} />');

    // Add import if currency was replaced
    if (code !== original) {
        if (!code.includes("import Currency") && !code.includes("import { Currency }")) {
            code = "import { Currency } from '@/components/Currency';\n" + code;
        }
    }

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
