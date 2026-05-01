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
        // If a line has both padding and textAlign: 'start' (usually empty states), change it to center.
        if (lines[i].includes("textAlign: 'start'") && lines[i].includes("padding:")) {
            lines[i] = lines[i].replace("textAlign: 'start'", "textAlign: 'center'");
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(f, lines.join('\n'), 'utf8');
        console.log('Modified: ' + f);
    }
});
