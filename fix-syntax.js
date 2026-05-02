const fs = require('fs');
const path = require('path');

const filesToFix = [
    'src/app/accounts/new/page.tsx',
    'src/app/cost-centers/[id]/page.tsx',
    'src/app/sale-returns/[id]/page.tsx',
    'src/app/settings/page.tsx',
    'src/app/stocktakings/new/page.tsx',
    'src/app/warehouse-transfers/new/page.tsx'
];

filesToFix.forEach(relPath => {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // The issue is an extra `}` after `if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }`
    content = content.replace(/if \(loading\) \{ return <DashboardLayout><ContentSkeleton \/><\/DashboardLayout>; \}\s+\}\s+return \(/g, 
        `if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }\n\n    return (`);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed ${relPath}`);
});
