const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const AUDIT_REPORT_PATH = path.join(ROOT_DIR, 'src/app/brain/contracting_forms_audit.md');

const CONTRACTING_FOLDERS = [
    'src/app/projects',
    'src/app/subcontractors',
    'src/app/sub-contracts',
    'src/app/progress-bills',
    'src/app/sales',
    'src/app/purchases',
    'src/app/items',
    'src/app/categories',
    'src/app/warehouses',
    'src/app/customers',
    'src/app/suppliers',
    'src/app/employees',
    'src/app/receipts',
    'src/app/payments'
];

// Keywords that are inappropriate or require review in a pure Contracting context
const SUSPICIOUS_KEYWORDS = [
    { word: 'الباركود', reason: 'Retail/Barcode term - usually not used in contracting materials/services' },
    { word: 'باركود', reason: 'Retail/Barcode term - usually not used in contracting materials/services' },
    { word: 'المنيو', reason: 'Restaurant/Menu term' },
    { word: 'منيو', reason: 'Restaurant/Menu term' },
    { word: 'الكاشير', reason: 'Retail/POS term' },
    { word: 'كاشير', reason: 'Retail/POS term' },
    { word: 'POS', reason: 'Point of Sale term' },
    { word: 'طاولة', reason: 'Restaurant Table term' },
    { word: 'طاولات', reason: 'Restaurant Table term' },
    { word: 'التوصيل', reason: 'Restaurant/Retail Delivery term' },
    { word: 'سعر البيع', reason: 'Retail term (Contracting prefers "التكلفة التقديرية" or "سعر الخدمة")' },
    { word: 'الأصناف', reason: 'Generic term (Contracting prefers "المواد والبنود")' },
    { word: 'صنف', reason: 'Generic term (Contracting prefers "بند / مادة")' },
    { word: 'العملاء', reason: 'Generic term (Contracting prefers "أصحاب المشاريع")' },
    { word: 'العميل', reason: 'Generic term (Contracting prefers "صاحب المشروع")' },
    { word: 'المخازن', reason: 'Generic term (Contracting prefers "المخازن والمواقع")' },
    { word: 'المخزن', reason: 'Generic term (Contracting prefers "المخزن / الموقع")' }
];

console.log('==================================================');
console.log('  STARTING CONTRACTING FORMS FIELD EXTRACTOR');
console.log('==================================================\n');

const formsAudit = [];

function scanFile(filePath) {
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    // Simple heuristic to check if the file contains forms
    if (!content.includes('<form') && !content.includes('<input') && !content.includes('<select') && !content.includes('CustomSelect')) {
        return;
    }

    const fields = [];
    
    // 1. Extract standard HTML Labels and translation labels
    // e.g. <label style={...}>اسم العميل</label> or t('اسم العميل') inside a label
    const labelRegex = /<label[^>]*>([\s\S]*?)<\/label>/gi;
    let match;
    while ((match = labelRegex.exec(content)) !== null) {
        let labelText = match[1].replace(/<[^>]+>/g, '').trim(); // strip inner HTML tags like span
        labelText = labelText.replace(/[\{\}']/g, '').replace(/t\((.*?)\)/g, '$1').trim();
        
        if (labelText && labelText.length < 100 && !labelText.includes('form') && !labelText.includes('div')) {
            fields.push({ type: 'Label', text: labelText, line: getLineNumber(content, match.index) });
        }
    }

    // 2. Extract t('...') labels inside inputs or placeholders
    const placeholderRegex = /placeholder\s*=\s*(?:['"]([^'"]+)['"]|\{\s*t\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\})/gi;
    while ((match = placeholderRegex.exec(content)) !== null) {
        const val = match[1] || match[2];
        if (val) {
            fields.push({ type: 'Placeholder', text: val, line: getLineNumber(content, match.index) });
        }
    }

    // 3. Extract dynamic translations or label attributes in CustomSelect or custom inputs
    const customSelectRegex = /label\s*=\s*(?:['"]([^'"]+)['"]|\{\s*t\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\})/gi;
    while ((match = customSelectRegex.exec(content)) !== null) {
        const val = match[1] || match[2];
        if (val && val.length < 50) {
            fields.push({ type: 'Label Prop', text: val, line: getLineNumber(content, match.index) });
        }
    }

    if (fields.length > 0) {
        // Deduplicate fields based on text and type
        const uniqueFields = [];
        const seen = new Set();
        for (const f of fields) {
            const key = `${f.type}:${f.text}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueFields.push(f);
            }
        }

        // Audit the fields for suspicious terms
        const auditedFields = uniqueFields.map(f => {
            const issues = [];
            for (const kw of SUSPICIOUS_KEYWORDS) {
                if (f.text.toLowerCase().includes(kw.word.toLowerCase())) {
                    // Check if it's dynamically guarded in code (i.e. has businessType === 'CONTRACTING' or similar nearby)
                    const lineContent = content.split('\n')[f.line - 1] || '';
                    const isGuarded = lineContent.includes('businessType') || lineContent.includes('isContracting') || lineContent.includes('companyBusinessType');
                    
                    issues.push({
                        keyword: kw.word,
                        reason: kw.reason,
                        isGuarded: isGuarded
                    });
                }
            }
            return {
                ...f,
                issues: issues
            };
        });

        formsAudit.push({
            file: relativePath,
            fields: auditedFields
        });
    }
}

function getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (['.next', 'node_modules', 'api', 'brain'].includes(file)) return;
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            scanFile(fullPath);
        }
    });
}

// Start scanning
CONTRACTING_FOLDERS.forEach(folder => {
    console.log(`Scanning: ${folder}...`);
    walk(path.join(ROOT_DIR, folder));
});

// Generate Markdown Report
let report = `# Contracting Activity Forms & Fields Audit Report\n\n`;
report += `This report lists all the inputs, placeholders, labels, and select fields extracted from pages/forms relevant to the **Contracting** (\`CONTRACTING\`) activity, auditing them to detect generic or retail-focused terms.\n\n`;

report += `## Summary of Scan\n`;
report += `- **Folders Scanned**: ${CONTRACTING_FOLDERS.length}\n`;
report += `- **Files with Forms Found**: ${formsAudit.length}\n\n`;

let totalIssues = 0;
let totalGuarded = 0;

formsAudit.forEach(fa => {
    fa.fields.forEach(f => {
        f.issues.forEach(issue => {
            if (issue.isGuarded) totalGuarded++;
            else totalIssues++;
        });
    });
});

report += `### Audit Highlights\n`;
report += `- ⚠️ **Unguarded Generic/Retail Terms Found**: **${totalIssues}** (requires manual review or verified dynamic guarding)\n`;
report += `- ✅ **Guarded Contracting Terms Found**: **${totalGuarded}** (correctly specialized using dynamic conditions)\n\n`;

report += `---\n\n`;
report += `## Detailed Audit per File\n\n`;

formsAudit.forEach(fa => {
    report += `### 📄 [${path.basename(fa.file)}](file:///${path.join(ROOT_DIR, fa.file).replace(/\\/g, '/')})\n`;
    report += `**Path**: \`${fa.file}\`\n\n`;
    
    report += `| Field Type | Label / Placeholder Text | Line No | Status / Issues |\n`;
    report += `| --- | --- | --- | --- |\n`;
    
    fa.fields.forEach(f => {
        let status = '✅ Suitable';
        if (f.issues.length > 0) {
            status = f.issues.map(iss => {
                if (iss.isGuarded) {
                    return `✅ Guarded (Contracting specialized: "${iss.keyword}")`;
                } else {
                    return `⚠️ Review: Contains "${iss.keyword}" (${iss.reason})`;
                }
            }).join('<br/>');
        }
        report += `| ${f.type} | \`${f.text}\` | ${f.line} | ${status} |\n`;
    });
    
    report += `\n---\n\n`;
});

// Write to file
fs.mkdirSync(path.dirname(AUDIT_REPORT_PATH), { recursive: true });
fs.writeFileSync(AUDIT_REPORT_PATH, report, 'utf8');

console.log(`\nReport successfully written to: ${AUDIT_REPORT_PATH}`);
console.log('==================================================');
