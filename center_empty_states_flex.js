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
        if (line.includes("textAlign: 'center'") || line.includes('textAlign: "center"')) {
            if (line.includes('padding: ') && (line.includes('px') || line.includes('rem'))) {
                // If it's a div and it has padding, and looks like an empty state wrapper
                if (line.includes('<div') && !line.includes('alignItems:') && !line.includes('flexDirection:')) {
                    lines[i] = line.replace(/textAlign:\s*['"]center['"]/, "textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'");
                    changed = true;
                }
            }
        }
    }
    if (changed) {
        fs.writeFileSync(f, lines.join('\n'), 'utf8');
        console.log('Modified display flex in: ' + f);
    }
});
