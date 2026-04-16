const fs = require('fs');
const path = require('path');

function fixFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    // 1. textAlign: (isRtl ? 'right' : 'left') or isRtl ? 'right' : 'left' -> textAlign: 'start'
    content = content.replace(/textAlign:\s*\(?\s*isRtl\s*\?\s*'right'\s*:\s*'left'\s*\)?/g, "textAlign: 'start'");
    
    // 2. textAlign: (isRtl ? 'left' : 'right') or isRtl ? 'left' : 'right' -> textAlign: 'end'
    content = content.replace(/textAlign:\s*\(?\s*isRtl\s*\?\s*'left'\s*:\s*'right'\s*\)?/g, "textAlign: 'end'");

    // 3. [isRtl ? 'right' : 'left']: -> insetInlineStart:
    content = content.replace(/\[\s*isRtl\s*\?\s*'right'\s*:\s*'left'\s*\]:/g, "insetInlineStart:");
    
    // 4. [isRtl ? 'left' : 'right']: -> insetInlineEnd:
    content = content.replace(/\[\s*isRtl\s*\?\s*'left'\s*:\s*'right'\s*\]:/g, "insetInlineEnd:");

    // 5. direction: 'rtl' -> direction: 'inherit' (to allow LTR switch)
    content = content.replace(/direction:\s*'rtl'/g, "direction: 'inherit'");

    // 6. !isRtl ? 'left' : 'right' -> 'start'
    content = content.replace(/textAlign:\s*\(?\s*!isRtl\s*\?\s*'left'\s*:\s*'right'\s*\)?/g, "textAlign: 'start'");

    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Fixed: ${filepath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                walk(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            fixFile(fullPath);
        }
    });
}

const baseDir = path.join(__dirname, '..');
walk(baseDir);
console.log('Done.');
