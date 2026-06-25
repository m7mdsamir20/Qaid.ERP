const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('toLocaleDateString') || content.includes('toLocaleString')) {
                results.push({ filePath, content });
            }
        }
    });
    return results;
}

const files = walk(srcDir);
files.forEach(f => {
    const lines = f.content.split('\n');
    lines.forEach((line, idx) => {
        if (line.includes('toLocaleDateString') || line.includes('toLocaleString')) {
            console.log(`${path.relative(srcDir, f.filePath)}:${idx + 1}: ${line.trim()}`);
        }
    });
});
