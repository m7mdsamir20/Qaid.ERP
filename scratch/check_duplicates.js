const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/lib/i18n.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const keys = {};
const duplicates = [];

lines.forEach((line, i) => {
    // Only look inside the 'en' object
    // Simple regex to match "key": "value"
    const match = line.match(/^\s*"(.*?)"\s*:/);
    if (match) {
        const key = match[1];
        if (keys[key]) {
            duplicates.push({ key, currentLine: i + 1, previousLine: keys[key] });
        } else {
            keys[key] = i + 1;
        }
    }
});

if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate keys:`);
    duplicates.forEach(d => {
        console.log(`Key: "${d.key}" | Line ${d.currentLine} (Previous: ${d.previousLine})`);
    });
} else {
    console.log('No duplicate keys found.');
}
