const fs = require('fs');
const path = require('path');

const srcAppDir = path.join(__dirname, 'src', 'app');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let changedFiles = 0;

walkDir(srcAppDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // We want to find: if (loading) return ( <DashboardLayout> ...Loader2... </DashboardLayout> );
    // Or similar variations.
    
    const dashboardLayoutRegex = /if\s*\(\s*loading\s*\)\s*(?:return\s*)?\{?(?:\s*return\s*)?\(\s*<DashboardLayout>\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*<\/DashboardLayout>\s*\);?\}?/g;
    
    content = content.replace(dashboardLayoutRegex, `if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }`);

    // What if it's missing the parenthesis?
    const dashboardLayoutRegex2 = /if\s*\(\s*loading\s*\)\s*(?:return\s*)?\{?(?:\s*return\s*)?<DashboardLayout>\s*<div[^>]*>[\s\S]*?<Loader2[\s\S]*?<\/div>\s*<\/DashboardLayout>;?\}?/g;
    
    content = content.replace(dashboardLayoutRegex2, `if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }`);

    if (content !== original) {
        // Need to ensure ContentSkeleton is imported
        if (!content.includes('import ContentSkeleton')) {
            content = `import ContentSkeleton from '@/components/ContentSkeleton';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        changedFiles++;
        console.log(`Updated ${filePath}`);
    }
});

console.log(`Changed ${changedFiles} files with DashboardLayout skeleton.`);
