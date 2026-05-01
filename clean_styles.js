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
    let original = content;

    // Pattern: textAlign: 'center', ... textAlign: (something)
    // We want to keep the LATER textAlign because it's usually the intended override
    content = content.replace(/textAlign:\s*'center'[\s\n]*,([\s\S]*?)(textAlign:)/g, (match, body, secondKey) => {
        // If there's a second textAlign in the match, we remove the first one
        return body + secondKey;
    });

    // Pattern: textAlign: 'center', ... textAlign: 'center'
    // Simplified: just remove the first textAlign if followed by another textAlign in the same object
    // We assume the object ends before another < tag starts to avoid cross-element matching
    content = content.replace(/(textAlign:\s*'center'[\s\n]*,)([\s\S]*?textAlign:)/g, "$2");

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Cleaned: ' + f);
    }
});
