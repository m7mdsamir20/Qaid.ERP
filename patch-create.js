const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('journalEntry.create')) {
                let newContent = content.replace(/(journalEntry\.create\s*\(\s*\{\s*data\s*:\s*\{)/g, 
                    "$1\n                                branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),");
                if (content !== newContent) {
                    fs.writeFileSync(fullPath, newContent);
                    console.log("Updated", fullPath);
                }
            }
        }
    }
}

processDir(path.join(__dirname, 'src', 'app', 'api'));
