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

const files = walk(path.join(__dirname, 'src', 'app'));
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const useClientRegex = /^['"]use client['"];?\s*/m;
    if (useClientRegex.test(content)) {
        // remove all occurrences
        const withoutClient = content.replace(/['"]use client['"];?\s*/g, '');
        // prepend
        const newContent = `'use client';\n` + withoutClient;
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf-8');
            changed++;
            console.log('Fixed:', file);
        }
    }
});
console.log('Fixed files:', changed);
