const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, 'src', 'app', 'reports');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let changedFiles = 0;

walkDir(reportsDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // We want to replace:
    // {loading ? ( <div...> ... <Loader2...> ... </div> ) : 
    // This is tricky. Let's use a regex that matches {loading ? ( <div ... <Loader2 ... </div> ) :
    const regex1 = /\{loading \? \(\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*\)\s*:/g;
    content = content.replace(regex1, `{loading ? ( <TableSkeleton /> ) :`);

    // Another format: {loading ? <div ... <Loader2 ... </div> :
    const regex2 = /\{loading \? \s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*:/g;
    content = content.replace(regex2, `{loading ? <TableSkeleton /> :`);

    // Another format: {loading && ( <div ... <Loader2 ... </div> )}
    const regex3 = /\{loading && \(\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*\)\}/g;
    content = content.replace(regex3, `{loading && ( <TableSkeleton /> )}`);

    if (content !== original) {
        if (!content.includes('import TableSkeleton')) {
            content = `import TableSkeleton from '@/components/TableSkeleton';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles++;
        console.log(`Updated ${filePath}`);
    }
});

console.log(`Changed ${changedFiles} files with TableSkeleton.`);
