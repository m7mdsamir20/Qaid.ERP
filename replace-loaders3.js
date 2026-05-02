const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, regex, replacement, isRtlStr) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    
    content = content.replace(regex, replacement);
    
    if (content !== original) {
        if (!content.includes('import StandaloneSkeleton')) {
            content = `import StandaloneSkeleton from '@/components/StandaloneSkeleton';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

// KDS
replaceInFile(
    path.join(__dirname, 'src/app/kds/page.tsx'),
    /if\s*\(\s*status === 'loading'\s*\)\s*\{\s*return\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>;\s*\}/g,
    `if (status === 'loading') { return <StandaloneSkeleton isRtl={isRtl} />; }`
);

// Barcode
replaceInFile(
    path.join(__dirname, 'src/app/barcode/page.tsx'),
    /if\s*\(\s*status === 'loading'\s*\)\s*\{\s*return\s*\(\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*\);\s*\}/g,
    `if (status === 'loading') { return <StandaloneSkeleton isRtl={isRtl} />; }`
);

// Tables
replaceInFile(
    path.join(__dirname, 'src/app/tables/page.tsx'),
    /if\s*\(\s*status === 'loading'\s*\)\s*\{\s*return\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>;\s*\}/g,
    `if (status === 'loading') { return <StandaloneSkeleton isRtl={isRtl} />; }`
);
