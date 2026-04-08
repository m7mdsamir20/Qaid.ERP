const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    let changedFiles = 0;
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            changedFiles += processDir(fullPath);
        } else if (file === 'page.tsx' || file === 'layout.tsx' || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // 1. Position left/right -> insetInlineStart/End
            content = content.replace(/\bright\s*:\s*(['"][^'"]+['"]|\d+|`[^`]+`)/g, 'insetInlineEnd: $1');
            content = content.replace(/\bleft\s*:\s*(['"][^'"]+['"]|\d+|`[^`]+`)/g, 'insetInlineStart: $1');

            // 2. Padding
            content = content.replace(/\bpaddingRight\s*:/g, 'paddingInlineEnd:');
            content = content.replace(/\bpaddingLeft\s*:/g, 'paddingInlineStart:');

            // 3. Margin
            content = content.replace(/\bmarginRight\s*:/g, 'marginInlineEnd:');
            content = content.replace(/\bmarginLeft\s*:/g, 'marginInlineStart:');

            // 4. Border
            content = content.replace(/\bborderRight\s*:/g, 'borderInlineEnd:');
            content = content.replace(/\bborderLeft\s*:/g, 'borderInlineStart:');

            // 5. Text Align
            content = content.replace(/textAlign:\s*(['"])(right|left)\1/g, (match, quote, align) => {
                if (align === 'right') return `textAlign: ${quote}start${quote}`;
                if (align === 'left') return `textAlign: ${quote}end${quote}`;
                return match;
            });
            
            // 6. direction: 'rtl' inside styles (not perfectly safe but we can try)
            // It's safer to not blindly replace all direction: 'rtl' as some might need to stay RTL, 
            // but the user's `isRtl` fixes them.
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                changedFiles++;
                console.log('Fixed logical CSS in:', fullPath);
            }
        }
    }
    return changedFiles;
}

const total = processDir('src/app');
const comps = processDir('src/components');
console.log('Total files fixed:', total + comps);
