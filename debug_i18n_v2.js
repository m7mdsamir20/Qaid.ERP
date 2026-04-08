const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.tsx', 'utf8');
const enStart = content.indexOf('en: {');
const enEnd = content.lastIndexOf('}');
const enContent = content.substring(enStart, enEnd + 1);
const lines = enContent.split('\n');
const keys = {};
lines.forEach((line, i) => {
    const match = line.match(/^\s*"([^"]+)"\s*:/);
    if (match) {
        const key = match[1];
        if (keys[key]) {
            console.log(`Duplicate key found: "${key}" at line ${i + 1} (previous at line ${keys[key]})`);
        }
        keys[key] = i + 1;
    }
});
console.log('Finished checking duplicates.');
