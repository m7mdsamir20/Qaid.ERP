const fs = require('fs');

const content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("t('")) {
        console.log("Original: ", lines[i].trim());
        
        // Convert the string to bytes by taking the charCode of each character (treating as ISO-8859-1)
        const bytes = [];
        for (let j = 0; j < lines[i].trim().length; j++) {
            bytes.push(lines[i].trim().charCodeAt(j) & 0xFF);
        }
        const buf = Buffer.from(bytes);
        
        console.log("Decoded:  ", buf.toString('utf8'));
        break;
    }
}
