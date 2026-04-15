const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'pc203', 'OneDrive', 'Desktop', 'ERP', 'erp-app', 'src', 'lib', 'i18n.tsx');

function deduplicate() {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Find the en: { ... } block
    const enBlockMatch = content.match(/en:\s*\{([\s\S]*?)\n\s*\}\s*,?\s*\}\s*;/);
    if (!enBlockMatch) {
         // try without semicolon at the end
         const enBlockMatch2 = content.match(/en:\s*\{([\s\S]*?)\n\s*\}\s*}/);
         if(!enBlockMatch2) {
            console.log("Could not find en block");
            return;
         }
         processEnBlock(enBlockMatch2[0], content);
         return;
    }
    processEnBlock(enBlockMatch[0], content);
}

function processEnBlock(enBlockFull, fullContent) {
    // Extract everything between the first { and the matching }
    const startIndex = enBlockFull.indexOf('{');
    const endIndex = enBlockFull.lastIndexOf('}');
    const innerContent = enBlockFull.substring(startIndex + 1, endIndex);
    
    const lines = innerContent.split('\n');
    const dictionary = {};
    const commentsAndBlanks = [];
    
    const keyValueRegex = /^\s*"(.*?)":\s*"(.*?)"(,?)\s*(.*)$/;
    
    const newLines = [];
    const seenKeys = new Set();
    
    // We'll iterate backwards to keep the LAST definition (which is usually the most recent/correct one)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const match = line.match(keyValueRegex);
        if (match) {
            const key = match[1];
            if (!seenKeys.has(key)) {
                newLines.unshift(line);
                seenKeys.add(key);
            }
        } else {
            // Keep comments and empty lines
            newLines.unshift(line);
        }
    }
    
    const cleanedInner = newLines.join('\n');
    const cleanedBlock = enBlockFull.substring(0, startIndex + 1) + cleanedInner + enBlockFull.substring(endIndex);
    
    const newFullContent = fullContent.replace(enBlockFull, cleanedBlock);
    fs.writeFileSync(filePath, newFullContent, 'utf-8');
    console.log("Deduplication complete using Node.js");
}

deduplicate();
