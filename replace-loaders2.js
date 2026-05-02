const fs = require('fs');
const path = require('path');

const filesToReplace = [
    'src/app/pos/page.tsx',
    'src/app/kds/page.tsx',
    'src/app/barcode/page.tsx'
];

filesToReplace.forEach(relPath => {
    const filePath = path.join(__dirname, relPath);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    const regex = /if\s*\(\s*(?:loading \|\| )?status === 'loading'\s*\)\s*\{\s*return\s*\(\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*\);\s*\}/g;
    
    content = content.replace(regex, `if (loading || status === 'loading') { return <StandaloneSkeleton isRtl={isRtl} />; }`);

    const regex2 = /if\s*\(\s*loading\s*\)\s*\{\s*return\s*\(\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*\);\s*\}/g;
    content = content.replace(regex2, `if (loading) { return <StandaloneSkeleton isRtl={isRtl} />; }`);

    if (content !== original) {
        if (!content.includes('import StandaloneSkeleton')) {
            content = `import StandaloneSkeleton from '@/components/StandaloneSkeleton';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${relPath}`);
    }
});
