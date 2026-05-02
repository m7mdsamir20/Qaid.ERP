const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/app/employees/page.tsx',
    'src/app/treasuries/page.tsx',
    'src/app/accounts/page.tsx',
    'src/app/partners/page.tsx'
];

filesToUpdate.forEach(relPath => {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('import TableSkeleton')) {
        content = `import TableSkeleton from '@/components/TableSkeleton';\n` + content;
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Added import to ${relPath}`);
    }
});
