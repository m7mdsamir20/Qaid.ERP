const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    let changedFiles = 0;
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            changedFiles += processDir(fullPath);
        } else if (file === 'page.tsx' || file === 'layout.tsx') {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Only process files that have a hardcoded RTL dir
            if (content.includes('dir=\"rtl\"') || content.includes('dir=\'rtl\'')) {
                
                // 1. Add Import
                if (!content.includes('@/lib/i18n')) {
                    if (content.includes('import')) {
                        content = content.replace(/(import .*?;\n)/, `$1import { useTranslation } from '@/lib/i18n';\n`);
                    } else {
                        content = 'import { useTranslation } from \'@/lib/i18n\';\n' + content;
                    }
                }

                // 2. Add Hooks inside the main component function
                if (!content.includes('const isRtl =') && !content.includes('useTranslation()')) {
                    // Match 'export default function Name() {'
                    content = content.replace(/(export default function \w+\(.*?\)\s*\{)/, `$1\n    const { lang, t } = useTranslation();\n    const isRtl = lang === 'ar';`);
                } else if (!content.includes('const isRtl =')) {
                    // if it already has useTranslation returning something else
                    content = content.replace(/(const .*? = useTranslation\(\);)/, `$1\n    const isRtl = lang === 'ar';`);
                }

                // 3. Replace dir='rtl'
                content = content.replace(/dir=[\"']rtl[\"']/g, `dir={isRtl ? 'rtl' : 'ltr'}`);
                
                if (content !== originalContent) {
                    fs.writeFileSync(fullPath, content);
                    changedFiles++;
                    console.log('Fixed RTL in:', fullPath);
                }
            }
        }
    }
    return changedFiles;
}

const total = processDir('src/app');
console.log('Total files fixed:', total);
