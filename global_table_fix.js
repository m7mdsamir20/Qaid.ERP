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

    // 1. Fix <th> tags with inline styles in reports
    // Look for the block style of headers in reports
    const thRegex = /<th[^>]*style=\{\{\s*padding:\s*'16px 20px',([^}]*)\}\}/g;
    content = content.replace(thRegex, (match, body) => {
        if (!body.includes('textAlign')) {
            return match.replace("padding: '16px 20px',", "padding: '16px 20px', textAlign: 'center',");
        }
        return match;
    });

    // 2. Fix <td> tags with inline styles in reports
    const tdRegex = /<td[^>]*style=\{\{\s*padding:\s*'14px 20px',([^}]*)\}\}/g;
    content = content.replace(tdRegex, (match, body) => {
        if (!body.includes('textAlign')) {
            return match.replace("padding: '14px 20px',", "padding: '14px 20px', textAlign: 'center',");
        }
        return match;
    });

    // 3. Remove explicit textAlign: 'start' from table-related styles if found
    // This is bold, but the user asked for it "entirely".
    // We only do this if it's likely a table cell.
    content = content.replace(/(<th|<td)[^>]*textAlign:\s*'start'/g, (match) => {
        return match.replace("textAlign: 'start'", "textAlign: 'center'");
    });

    // 4. Update textMuted to textSecondary in table headers for better visibility
    const mutedHeaderRegex = /<th[^>]*style=\{([^}]*)color:\s*C\.textMuted([^}]*)\}/g;
    content = content.replace(mutedHeaderRegex, (match) => {
        return match.replace('C.textMuted', 'C.textSecondary');
    });

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Processed: ' + f);
    }
});
