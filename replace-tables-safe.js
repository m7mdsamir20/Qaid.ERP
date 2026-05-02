const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/app/employees/page.tsx',
    'src/app/installments/page.tsx',
    'src/app/treasuries/page.tsx',
    'src/app/accounts/page.tsx',
    'src/app/partners/page.tsx',
    'src/app/partner-accounts/page.tsx',
    'src/app/deductions/page.tsx',
    'src/app/advances/page.tsx',
    'src/app/departments/page.tsx',
    'src/app/capital/page.tsx',
    'src/app/categories/page.tsx',
    'src/app/items/page.tsx'
];

let changed = 0;

filesToUpdate.forEach(relPath => {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Safe regex: matches <div ...> <Loader2 ... /> </div>
    const regex = /\{loading \? \(\s*<div[^>]*>\s*<Loader2[^>]*\/>\s*<\/div>\s*\)\s*:/g;
    content = content.replace(regex, `{loading ? ( <TableSkeleton /> ) :`);

    const regex2 = /\{loading \? \s*<div[^>]*>\s*<Loader2[^>]*\/>\s*<\/div>\s*:/g;
    content = content.replace(regex2, `{loading ? <TableSkeleton /> :`);

    if (content !== original) {
        if (!content.includes('import TableSkeleton')) {
            content = `import TableSkeleton from '@/components/TableSkeleton';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        changed++;
        console.log(`Updated ${relPath}`);
    }
});

console.log(`Changed ${changed} files.`);
