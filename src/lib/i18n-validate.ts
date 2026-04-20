/**
 * i18n-validate.ts
 *
 * Run with: npx ts-node src/lib/i18n-validate.ts
 *
 * Reports:
 *  - Total EN dictionary keys
 *  - Keys used via t() across the codebase
 *  - Keys used but missing from EN dictionary (needs translation)
 *  - Keys in EN dictionary never used (dead entries)
 */

import fs from 'fs';
import path from 'path';
import { dictionaries, I18N_VERSION } from './i18n';

const SRC_DIR = './src';
const T_CALL_REGEX = /\bt\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
const ARABIC_REGEX = /[\u0600-\u06FF]/;

function collectUsedKeys(dir: string, keys: Set<string> = new Set()): Set<string> {
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') collectUsedKeys(fullPath, keys);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            if (fullPath.includes('i18n.tsx') || fullPath.includes('i18n-validate') || fullPath.includes('check_translations')) continue;
            const content = fs.readFileSync(fullPath, 'utf-8');
            T_CALL_REGEX.lastIndex = 0;
            let m;
            while ((m = T_CALL_REGEX.exec(content)) !== null) {
                keys.add(m[1]);
            }
        }
    }
    return keys;
}

const enDict = dictionaries.en as Record<string, string>;
const dictKeys = new Set(Object.keys(enDict));
const usedKeys = collectUsedKeys(SRC_DIR);

const arabicUsedKeys = [...usedKeys].filter(k => ARABIC_REGEX.test(k));
const missingInDict = arabicUsedKeys.filter(k => !dictKeys.has(k));
const neverUsed = [...dictKeys].filter(k => !usedKeys.has(k));

console.log(`\n[i18n] Version: ${I18N_VERSION}`);
console.log(`[i18n] EN dictionary entries : ${dictKeys.size}`);
console.log(`[i18n] Unique t() calls found : ${usedKeys.size}`);
console.log(`[i18n] Arabic keys used       : ${arabicUsedKeys.length}`);

if (missingInDict.length === 0) {
    console.log('\n✅ All Arabic t() keys have EN translations.');
} else {
    console.warn(`\n⚠️  ${missingInDict.length} Arabic keys used in t() but MISSING from EN dictionary:`);
    missingInDict.forEach(k => console.warn(`   "${k}"`));
}

if (neverUsed.length === 0) {
    console.log('✅ No dead EN dictionary entries.');
} else {
    console.log(`\nℹ️  ${neverUsed.length} EN dictionary entries never referenced by t() (safe to prune):`);
    neverUsed.slice(0, 20).forEach(k => console.log(`   "${k}"`));
    if (neverUsed.length > 20) console.log(`   ... and ${neverUsed.length - 20} more`);
}

console.log('');
process.exit(missingInDict.length > 0 ? 1 : 0);
