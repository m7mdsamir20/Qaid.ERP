
const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.tsx', 'utf8');

const arStart = content.indexOf('"ar": {');
const arEnd = content.indexOf('},', arStart) + 1;
const enStart = content.indexOf('"en": {', arEnd);
const enEnd = content.lastIndexOf('}') + 1;

function cleanDict(dictStr) {
    // This is a naive way to parse the JSON-like object literal
    // We'll extract lines that look like "key": "value",
    const lines = dictStr.split('\n');
    const seen = new Set();
    const result = [];
    
    // Process from bottom to top to keep the latest entries
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const match = line.match(/^\s*"([^"]+)":\s*"([^"]*)"\s*,?\s*$/);
        if (match) {
            const key = match[1];
            if (seen.has(key)) {
                // Skip duplicate
                continue;
            }
            seen.add(key);
            result.unshift(line);
        } else {
            result.unshift(line);
        }
    }
    return result.join('\n');
}

const head = content.substring(0, arStart);
const arContent = content.substring(arStart, arEnd);
const middle = content.substring(arEnd, enStart);
const enContent = content.substring(enStart, enEnd);
const tail = content.substring(enEnd);

const newAr = cleanDict(arContent);
const newEn = cleanDict(enContent);

fs.writeFileSync('src/lib/i18n.tsx', head + newAr + middle + newEn + tail);
console.log('Deduplicated i18n.tsx');
