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

    // Use a more robust regex that handles newlines and optional spaces
    // For <th> padding
    content = content.replace(/(style=\{\{\s*padding:\s*'16px 20px',)/g, "$1 textAlign: 'center',");
    content = content.replace(/(style=\{\s*\{\s*padding:\s*'16px 20px',)/g, "$1 textAlign: 'center',");
    
    // For <td> padding
    content = content.replace(/(style=\{\{\s*padding:\s*'14px 20px',)/g, "$1 textAlign: 'center',");
    content = content.replace(/(style=\{\s*\{\s*padding:\s*'14px 20px',)/g, "$1 textAlign: 'center',");

    // Fix textAlign: 'start' globally in tags
    content = content.replace(/textAlign:\s*'start'/g, "textAlign: 'center'");

    // Update headers text color
    content = content.replace(/color:\s*C\.textMuted/g, 'color: C.textSecondary');

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Processed: ' + f);
    }
});
