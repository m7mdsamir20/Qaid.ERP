const fs = require('fs');
const path = require('path');

function getFiles(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) return;
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(getFiles(fullPath));
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('src\\\\app\\\\reports') && !fullPath.includes('src/app/reports')) {
            files.push(fullPath);
        }
    });
    return files;
}

const files = getFiles('src/app');

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');
    let original = code;

    // Check if import Currency is before 'use client'
    if (code.startsWith("import { Currency }") && code.includes("'use client';")) {
        code = code.replace("import { Currency } from '@/components/Currency';\n", "");
        code = code.replace("'use client';", "'use client';\nimport { Currency } from '@/components/Currency';");
    } else if (code.startsWith("import { Currency }") && code.includes('"use client";')) {
        code = code.replace("import { Currency } from '@/components/Currency';\n", "");
        code = code.replace('"use client";', '"use client";\nimport { Currency } from "@/components/Currency";');
    }

    if (code !== original) {
        fs.writeFileSync(file, code);
    }
}
