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

    // Currency Formatting (nested parens handled with .*?)
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

    // Table alignemnt fix
    // 1. Remove textAlign from th and td
    code = code.replace(/(<t[hd][^>]*style=\{\{?[^}]*)textAlign:\s*['"](?:center|left|right|end|start)['"]\s*,?/g, '$1');
    
    // 2. Remove justifyContent center if it wraps a Currency component or fmt function
    // We will do this line-by-line to be safe.
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if ((lines[i].includes('<Currency') || lines[i].includes('fmt(')) && lines[i].includes('justifyContent')) {
            lines[i] = lines[i].replace(/justifyContent:\s*['"]center['"]/, 'justifyContent: "flex-end"');
            // Wait, flex-end aligns to the right in LTR, and left in RTL! 
            // The user said: "Numbers: Always right-aligned in both languages."
            // Wait, if numbers are ALWAYS right-aligned in both languages...
            // In RTL, right-aligned means "flex-start". In LTR, right-aligned means "flex-end".
            // So we can't hardcode flex-end.
            // Better to just remove `justifyContent` and let `textAlign: right` do the job, OR we can conditionally use isRtl.
            // Let's just remove it:
            lines[i] = lines[i].replace(/justifyContent:\s*['"][^'"]*['"]\s*,?/, '');
            
            // Wait, if it has `display: flex`, removing justifyContent will default to flex-start.
            // In RTL, flex-start = right. In LTR, flex-start = left. But we want RIGHT in both languages!
            // Actually, if we want RIGHT in both languages:
            // RTL: flex-start
            // LTR: flex-end
            // So we can use: `justifyContent: isRtl ? 'flex-start' : 'flex-end'`
            lines[i] = lines[i].replace(/display:\s*['"]flex['"]\s*,?/, '');
            lines[i] = lines[i].replace(/alignItems:\s*['"]baseline['"]\s*,?/, '');
        }
    }
    code = lines.join('\n');

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
