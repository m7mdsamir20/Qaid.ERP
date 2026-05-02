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
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src', 'app'));
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Check if use client exists at all
    if (content.includes("'use client'") || content.includes('"use client"')) {
        // Remove ALL use clients (even those with a BOM before them)
        const newContentWithoutClient = content.replace(/\uFEFF?['"]use client['"];?\s*/g, '');
        
        // Only if it actually removed it and the first thing is not already use client
        // wait, let's just make it 'use client'; at the very top.
        const finalContent = "'use client';\n" + newContentWithoutClient;
        
        if (content !== finalContent) {
            fs.writeFileSync(file, finalContent, 'utf-8');
            changed++;
        }
    }
});
console.log('Really fixed files:', changed);
