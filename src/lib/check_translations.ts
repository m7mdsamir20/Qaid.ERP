import fs from 'fs';
import path from 'path';
import { dictionaries } from './i18n';

const SRC_DIR = './src';
const ARABIC_REGEX = /[\u0600-\u06FF]/;
const UNWRAPPED_REGEX = /['"`]([^'"`]*[\u0600-\u06FF][^'"`]*)['"`]/g;
const T_CALL_REGEX = /\bt\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

function scanDir(dir: string, results: { unwrapped: string[]; missing: string[] } = { unwrapped: [], missing: [] }) {
    const enDict = dictionaries.en as Record<string, string>;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') {
                scanDir(fullPath, results);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (fullPath.includes('i18n.tsx') || fullPath.includes('check_translations') || fullPath.includes('i18n-validate')) continue;

            // Check 1: Arabic strings not wrapped in t()
            let match;
            UNWRAPPED_REGEX.lastIndex = 0;
            while ((match = UNWRAPPED_REGEX.exec(content)) !== null) {
                const innerText = match[1];
                const index = match.index;
                const beforeStr = content.substring(Math.max(0, index - 3), index);
                if (beforeStr !== 't(' && !innerText.includes('dictionaries')) {
                    results.unwrapped.push(`${fullPath}: "${innerText}"`);
                }
            }

            // Check 2: t() calls whose keys are missing from the EN dictionary
            T_CALL_REGEX.lastIndex = 0;
            while ((match = T_CALL_REGEX.exec(content)) !== null) {
                const key = match[1];
                if (ARABIC_REGEX.test(key) && !(key in enDict)) {
                    results.missing.push(`${fullPath}: t("${key}") — no EN translation`);
                }
            }
        }
    }
    return results;
}

const { unwrapped, missing } = scanDir(SRC_DIR);

let exitCode = 0;

if (unwrapped.length === 0) {
    console.log('✅ All Arabic strings in src/ are wrapped in t()');
} else {
    console.warn(`⚠️  ${unwrapped.length} unwrapped Arabic strings found:`);
    unwrapped.forEach(m => console.warn('  ', m));
    exitCode = 1;
}

if (missing.length === 0) {
    console.log('✅ All t() keys have EN translations in the dictionary');
} else {
    console.warn(`⚠️  ${missing.length} t() keys missing from EN dictionary:`);
    missing.forEach(m => console.warn('  ', m));
    // Warn only — do not fail build for missing translations
}

process.exit(exitCode);
