import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';
const ARABIC_REGEX = /[\u0600-\u06FF]/;
// Matches strings in quotes, but we want to ignore those already wrapped in t()
// This is a naive check to help identify potential missing translations
const STRING_REGEX = /['"`]([^'"`]*[\u0600-\u06FF][^'"`]*)['"`]/g;

function scanDir(dir: string, results: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                scanDir(fullPath, results);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('i18n.tsx')) continue; // Skip the dictionary itself

            let match;
            while ((match = STRING_REGEX.exec(content)) !== null) {
                const fullMatch = match[0];
                const innerText = match[1];
                
                // Check if it's NOT wrapped in t( ... )
                const index = match.index;
                const beforeStr = content.substring(Math.max(0, index - 3), index);
                
                if (beforeStr !== 't(' && !innerText.includes('dictionaries')) {
                    results.push(`${fullPath}: "${innerText}"`);
                }
            }
        }
    }
    return results;
}

const missing = scanDir(SRC_DIR);
if (missing.length === 0) {
    console.log("SUCCESS: All Arabic strings in src/ are wrapped in t()");
} else {
    console.log(`FOUND ${missing.length} potential untranslated strings:`);
    missing.forEach(m => console.log(m));
}
