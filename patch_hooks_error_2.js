const fs = require('fs');
let content = fs.readFileSync('src/app/pos/page.tsx', 'utf-8');

const lines = content.split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if (status === 'loading') {")) {
        startIdx = i;
    }
    if (startIdx !== -1 && lines[i].trim() === '}' && i > startIdx + 10) {
        endIdx = i;
        break;
    }
}

console.log("startIdx:", startIdx, "endIdx:", endIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const extracted = lines.splice(startIdx, endIdx - startIdx + 1);
    
    let mainReturnIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("return (") && lines[i+1] && lines[i+1].includes("<>")) {
            mainReturnIdx = i;
            break;
        }
    }
    
    console.log("mainReturnIdx:", mainReturnIdx);

    if (mainReturnIdx !== -1) {
        lines.splice(mainReturnIdx, 0, ...extracted, '');
        fs.writeFileSync('src/app/pos/page.tsx', lines.join('\n'), 'utf-8');
        console.log("Fixed successfully.");
    } else {
        console.log("Main return not found.");
    }
} else {
    console.log("Early returns not found.");
}
