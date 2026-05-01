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

    // 1. Revert textAlign: 'center' from <input> tags
    // We look for textAlign: 'center' inside an input style
    content = content.replace(/(<input[^>]*style=\{[\s\S]*?)textAlign:\s*'center'/g, (match, before) => {
        // Only if it's not a button or something that should be centered
        return before + "textAlign: 'start'";
    });

    // 2. For tables in reports: 
    // We should keep center only for columns that likely contain Numbers, Types, or IDs.
    // This is hard to do with regex perfectly, but we can target specific headers if they are in the same file.
    
    // Actually, the user specifically mentioned "التاريخ والطرف" (Date and Party) should be under the column.
    // So we should revert textAlign to start for cells containing dates or names.

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Reverted: ' + f);
    }
});
