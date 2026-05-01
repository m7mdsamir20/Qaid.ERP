const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('src/app');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
            (line.includes("padding: '80px") || 
             line.includes("padding: '100px") || 
             line.includes("padding: '120px") || 
             line.includes("padding: '60px"))
        ) {
            if (line.includes('<div') && !line.includes('textAlign')) {
                lines[i] = line.replace(/style=\{\{\s*/, "style={{ textAlign: 'center', ");
                changed = true;
            }
        }
    }
    if (changed) {
        fs.writeFileSync(f, lines.join('\n'), 'utf8');
        console.log('Modified missing textAlign in: ' + f);
    }
});
