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

    // Use a regex that catches duplicate textAlign: 'center' with various spacings and newlines
    // The [^}]*? matches content within the style object
    
    // Simplest approach: global string replacement for the most common mistake
    let oldContent;
    do {
        oldContent = content;
        content = content.replace(/textAlign:\s*'center'[\s\n]*,[\s\n]*textAlign:\s*'center'/g, "textAlign: 'center'");
    } while (content !== oldContent);

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Fixed duplicates in: ' + f);
    }
});
