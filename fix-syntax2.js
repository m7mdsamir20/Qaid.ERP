const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/app/cost-centers/[id]/page.tsx',
    'src/app/sale-returns/[id]/page.tsx',
    'src/app/settings/page.tsx'
];

filesToFix.forEach(relPath => {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Using simple regex that finds the `</DashboardLayout>; }` followed by `}` and removes the extra `}`
    content = content.replace(/<\/DashboardLayout>;\s*\}\s*\}/g, '</DashboardLayout>;\n    }');
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed ${relPath}`);
});
