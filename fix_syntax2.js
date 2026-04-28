const fs = require('fs');
const file = 'src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');
let lines = content.split(/\r?\n/);

// Remove the specific lines around index 1271 (0-indexed)
// Note: line 1272 is lines[1271]
// let's just find the pattern
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes("</div>") && lines[i+1] && lines[i+1].includes(")}")) {
        // check if line above is "            )}"
        if(i > 0 && lines[i-1].includes("            )}")) {
            console.log("Found at line " + (i+1));
            lines.splice(i, 2);
            break;
        }
    }
}
fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Fixed syntax error');
