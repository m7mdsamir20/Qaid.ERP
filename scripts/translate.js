const fs = require('fs');
const path = require('path');

const I18N_PATH = path.join(__dirname, '../src/lib/i18n.tsx');

// Helper to sleep between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Unescape helper
function unescapeStringLiteral(str) {
    return str.replace(/\\(.)/g, (match, char) => {
        switch (char) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'v': return '\v';
            case '0': return '\0';
            case '\\': return '\\';
            case '"': return '"';
            case "'": return "'";
            case '`': return '`';
            default: return char;
        }
    });
}

// Escape helper for double quoted string in JS
function escapeStringLiteral(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

// Public translation API call
async function translateText(text) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Combine all translated parts
    if (data && data[0]) {
        return data[0].map(item => item[0]).join('');
    }
    throw new Error('Unexpected translation response format');
}

async function main() {
    if (!fs.existsSync(I18N_PATH)) {
        console.error(`Error: i18n file not found at ${I18N_PATH}`);
        return;
    }
    console.log('Reading i18n file...');
    const i18nContent = fs.readFileSync(I18N_PATH, 'utf8');

    // Find dictionaries.en block
    const enStartIndex = i18nContent.indexOf('en: {');
    if (enStartIndex === -1) {
        console.error('Error: Could not find "en: {" block');
        return;
    }

    let braceCount = 1;
    let enEndIndex = -1;
    const startSearchIndex = enStartIndex + 'en: {'.length;
    for (let i = startSearchIndex; i < i18nContent.length; i++) {
        if (i18nContent[i] === '{') braceCount++;
        else if (i18nContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) { enEndIndex = i; break; }
        }
    }

    if (enEndIndex === -1) {
        console.error('Error: Could not find closing brace for en block');
        return;
    }

    const enBlockContent = i18nContent.substring(startSearchIndex, enEndIndex);
    
    // Parse key-value pairs
    const pairRegex = /"((?:[^"\\]|\\.)*)"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
    const allTranslations = []; // array of { key, val, rawLine }
    let match;
    const arRegex = /[\u0600-\u06FF]/;

    while ((match = pairRegex.exec(enBlockContent)) !== null) {
        const rawKey = match[1];
        const rawVal = match[2] || match[3];
        const key = unescapeStringLiteral(rawKey);
        const val = unescapeStringLiteral(rawVal);
        
        allTranslations.push({
            key,
            val,
            isArabic: arRegex.test(val)
        });
    }

    const untranslated = allTranslations.filter(t => t.isArabic);
    console.log(`Found ${allTranslations.length} total keys. ${untranslated.length} need translation.`);

    if (untranslated.length === 0) {
        console.log('All keys are already translated!');
        return;
    }

    const batchSize = 30;
    const translatedMap = new Map();

    for (let i = 0; i < untranslated.length; i += batchSize) {
        const batch = untranslated.slice(i, i + batchSize);
        console.log(`Translating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(untranslated.length / batchSize)} (keys ${i + 1} to ${Math.min(i + batchSize, untranslated.length)})...`);
        
        // Skip keys that are code blocks / JSON-like (e.g. starting with { or containing a lot of code syntax)
        const batchKeysToTranslate = [];
        const skippedKeys = [];
        
        batch.forEach(item => {
            const cleanText = item.key.trim();
            if ((cleanText.startsWith('{') && cleanText.endsWith('}')) || 
                cleanText.includes('POST /api') || 
                cleanText.includes('@keyframes') ||
                cleanText.length > 200) {
                skippedKeys.push(item.key);
            } else {
                batchKeysToTranslate.push(item.key);
            }
        });

        if (batchKeysToTranslate.length > 0) {
            const separator = ' \n ';
            const combinedText = batchKeysToTranslate.join(separator);
            
            try {
                const translatedCombined = await translateText(combinedText);
                const translatedLines = translatedCombined.split('\n').map(s => s.trim()).filter(Boolean);
                
                if (translatedLines.length === batchKeysToTranslate.length) {
                    for (let j = 0; j < batchKeysToTranslate.length; j++) {
                        translatedMap.set(batchKeysToTranslate[j], translatedLines[j]);
                    }
                } else {
                    console.warn(`Warning: Batch line count mismatch (${translatedLines.length} vs ${batchKeysToTranslate.length}). Falling back to individual translation...`);
                    for (const key of batchKeysToTranslate) {
                        try {
                            const trans = await translateText(key);
                            translatedMap.set(key, trans.trim());
                            await sleep(200);
                        } catch (err) {
                            console.error(`Failed to translate key: "${key}":`, err.message);
                        }
                    }
                }
            } catch (err) {
                console.error('Batch translation failed. Falling back to individual translation:', err.message);
                for (const key of batchKeysToTranslate) {
                    try {
                        const trans = await translateText(key);
                        translatedMap.set(key, trans.trim());
                        await sleep(200);
                    } catch (err) {
                        console.error(`Failed to translate key: "${key}":`, err.message);
                    }
                }
            }
        }

        // Set skipped keys to English translation placeholders
        skippedKeys.forEach(key => {
            translatedMap.set(key, key); // keep code/JSON blocks as-is
        });

        await sleep(1000); // 1s delay between batches
    }

    console.log('Translation complete. Rebuilding i18n file content...');
    
    let lastIdx = 0;
    let rebuiltEnBlock = '';
    pairRegex.lastIndex = 0;
    
    while ((match = pairRegex.exec(enBlockContent)) !== null) {
        const rawKey = match[1];
        const key = unescapeStringLiteral(rawKey);
        
        rebuiltEnBlock += enBlockContent.substring(lastIdx, match.index);
        
        let valToWrite = match[2] || match[3];
        if (translatedMap.has(key)) {
            valToWrite = escapeStringLiteral(translatedMap.get(key));
        } else {
            valToWrite = escapeStringLiteral(unescapeStringLiteral(valToWrite));
        }
        
        const _escapedKey = escapeStringLiteral(key);
        rebuiltEnBlock += `"${_escapedKey}": "${valToWrite}"`;
        
        lastIdx = pairRegex.lastIndex;
    }
    rebuiltEnBlock += enBlockContent.substring(lastIdx);
    
    const finalI18nContent = i18nContent.substring(0, startSearchIndex) + rebuiltEnBlock + i18nContent.substring(enEndIndex);
    
    fs.writeFileSync(I18N_PATH, finalI18nContent, 'utf8');
    console.log('Successfully updated i18n.tsx with translations!');
}

main().catch(err => {
    console.error('Fatal error:', err);
});
