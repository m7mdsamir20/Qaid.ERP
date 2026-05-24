const fs = require('fs');

function fixPage() {
    const file = 'src/app/installments/page.tsx';
    let code = fs.readFileSync(file, 'utf8');

    // Remove toggle buttons block (lines 458-461)
    const toggleBlockRegex = /<div style=\{\{ display: 'flex', gap: '8px', marginBottom: '16px' \}\}>[\s\S]*?جدولة فاتورة آجلة'\)}[\s\S]*?<\/div>[\s\S]*?<\/div>/g;
    code = code.replace(toggleBlockRegex, '');

    // Replace the handleSubmit body entirely because it still has `planType` references in the original file
    // Wait, my `update-ui-state.js` already replaced handleSubmit. Let's check if there's any other `planType`.
    // I'll just remove all remaining references to `planType`.
    code = code.replace(/\|\| \(planType === 'direct' && !selectedItem\) \|\| \(planType === 'invoice' && !\(form as any\)\.invoiceId\)/g, '');
    code = code.replace(/if \(planType === 'direct'\) \{[\s\S]*?\}\n\s*setSubmitting\(true\);/, 'setSubmitting(true);');
    
    // There might be another toggle block left over. Let's just find `setPlanType`
    code = code.replace(/<div onClick=\{\(\) => setPlanType\('direct'\)\}[\s\S]*?<\/div>/g, '');
    code = code.replace(/<div onClick=\{\(\) => setPlanType\('invoice'\)\}[\s\S]*?<\/div>/g, '');
    code = code.replace(/<div style=\{\{ display: 'flex', gap: '8px', marginBottom: '16px' \}\}>[\s\S]*?<\/div>\s*<\/div>/g, ''); // Try to catch the parent wrapper if empty

    fs.writeFileSync(file, code);
}
fixPage();
console.log('Fixed UI references');
