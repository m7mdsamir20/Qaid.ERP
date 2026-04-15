const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Text inside JSX Tags (exclude numbers and symbols)
    content = content.replace( />([^<{]*?[\u0600-\u06FF][^<{]*?)</g, (match, text) => {
        if(text.includes('t(')) return match;
        const trimmed = text.trim();
        if(trimmed === '' || trimmed === '*') return match;
        return `>{t('${trimmed.replace(/'/g, "\\'")}')}<`;
    });

    // 2. Common Attributes
    content = content.replace( /(placeholder|title|label|sub|subtitle)="([^"]*?[\u0600-\u06FF][^"]*?)"/g, (match, attr, text) => {
        return `${attr}={t('${text.replace(/'/g, "\\'")}')}`;
    });

    // 3. Object properties
    content = content.replace( /(label|sub|title|placeholder|name):\s*(['"])([^'"]*?[\u0600-\u06FF][^'"]*?)\2/g, (match, key, quote, text) => {
        if(match.includes('t(')) return match;
        return `${key}: t('${text.replace(/'/g, "\\'")}')`;
    });

    // 4. Ternary strings
    content = content.replace( /([\?:]\s*)(['"])([^'"]*?[\u0600-\u06FF][^'"]*?)\2/g, (match, operator, quote, text) => {
        if(match.includes('t(')) return match;
        return `${operator}t('${text.replace(/'/g, "\\'")}')`;
    });

    // 5. Array elements
    content = content.replace( /(?:\[|,)\s*(['"])([^'"]*?[\u0600-\u06FF][^'"]*?)\1(?=\s*\]|\s*,)/g, (match, quote, text) => {
        if(match.includes('t(')) return match;
        if(match.trim().startsWith('['))
            return `[t('${text.replace(/'/g, "\\'")}')`;
        return `, t('${text.replace(/'/g, "\\'")}')`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

console.log('Starting full localization audit...');
walk('src/app', processFile);
walk('src/components', processFile);
console.log('Audit complete.');
