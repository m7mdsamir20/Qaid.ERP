const fs = require('fs');
const path = require('path');

const newPageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let code = fs.readFileSync(newPageFile, 'utf8');

// 1. Fix useRef import
if (!code.includes('useRef')) {
    code = code.replace(/import \{.*?useState.*?\} from 'react';/, (match) => match.replace('useState', 'useState, useRef'));
}

// 2. The injected handlers were placed directly after `export default function NewInstallmentPage() {`
// But they need access to `setTempItem` and `addToCart` which are defined inside.
// Actually, wait, `addToCart` and `setTempItem` are defined lower down in the component!
// Let's just move the injected block to below the state definitions!

const injectedBlockRegex = /\s*const qtyInputRef = useRef[\s\S]*?const handlePriceKeyDown = \(e: React\.KeyboardEvent<HTMLInputElement>\) => \{[\s\S]*?\}\s*;\s*/;
const match = code.match(injectedBlockRegex);
if (match) {
    const injectedCode = match[0];
    code = code.replace(injectedCode, ''); // remove it from the top
    
    // Find a safe place to insert it. E.g. right before `return (`
    const returnStart = code.indexOf('return (');
    if (returnStart !== -1) {
        code = code.substring(0, returnStart) + '\n' + injectedCode + '\n' + code.substring(returnStart);
    }
}

fs.writeFileSync(newPageFile, code);
console.log('Fixed TS references in new page!');
