const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk(srcDir);

let count = 0;
files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace various locale patterns inside toLocaleDateString/toLocaleString with 'en-ZA'
    
    // 1. Match toLocaleDateString/toLocaleString with 'en-GB', 'ar-EG-u-nu-latn', 'ar-EG', 'en-US' (or ternary expressions)
    // We want to replace the locale argument (first argument) with 'en-ZA'
    
    // Replace toLocaleDateString/toLocaleString('en-GB')
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*'en-GB'\s*\)/g, "$1('en-ZA')");
    
    // Replace toLocaleDateString/toLocaleString('ar-EG-u-nu-latn')
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*'ar-EG-u-nu-latn'\s*\)/g, "$1('en-ZA')");

    // Replace toLocaleDateString/toLocaleString('ar-EG')
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*'ar-EG'\s*\)/g, "$1('en-ZA')");
    
    // Replace toLocaleDateString/toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*(lang|isRtl)\s*===\s*'ar'\s*\?\s*'ar-EG-u-nu-latn'\s*:\s*'en-GB'\s*\)/g, "$1('en-ZA')");
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*(lang|isRtl)\s*===\s*'ar'\s*\?\s*'ar-EG-u-nu-latn'\s*:\s*'en-GB'\s*,/g, "$1('en-ZA',");
    
    // Replace toLocaleDateString/toLocaleString(isRtl ? 'ar-EG' : 'en-GB')
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*isRtl\s*\?\s*'ar-EG'\s*:\s*'en-GB'\s*\)/g, "$1('en-ZA')");
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*isRtl\s*\?\s*'ar-EG'\s*:\s*'en-GB'\s*,/g, "$1('en-ZA',");

    // Replace toLocaleDateString/toLocaleString(isRtl ? 'ar-EG' : 'en-US')
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*isRtl\s*\?\s*'ar-EG'\s*:\s*'en-US'\s*\)/g, "$1('en-ZA')");
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*isRtl\s*\?\s*'ar-EG'\s*:\s*'en-US'\s*,/g, "$1('en-ZA',");

    // Replace toLocaleDateString/toLocaleString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { ... })
    content = content.replace(/(toLocaleDateString|toLocaleString)\(\s*lang\s*===\s*'ar'\s*\?\s*'ar-EG-u-nu-latn'\s*:\s*'en-GB'\s*,/g, "$1('en-ZA',");
    
    // Generic 'en-GB' / 'ar-EG' / 'ar-EG-u-nu-latn' in toLocaleDateString / toLocaleString calls
    content = content.replace(/toLocaleDateString\(\s*'en-GB'\s*,/g, "toLocaleDateString('en-ZA',");
    content = content.replace(/toLocaleDateString\(\s*'ar-EG'\s*,/g, "toLocaleDateString('en-ZA',");
    content = content.replace(/toLocaleDateString\(\s*'ar-EG-u-nu-latn'\s*,/g, "toLocaleDateString('en-ZA',");
    content = content.replace(/toLocaleString\(\s*'en-GB'\s*,/g, "toLocaleString('en-ZA',");
    content = content.replace(/toLocaleString\(\s*'ar-EG'\s*,/g, "toLocaleString('en-ZA',");
    content = content.replace(/toLocaleString\(\s*'ar-EG-u-nu-latn'\s*,/g, "toLocaleString('en-ZA',");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated dates in: ${path.relative(srcDir, filePath)}`);
        count++;
    }
});

console.log(`Successfully updated date formats in ${count} files.`);
