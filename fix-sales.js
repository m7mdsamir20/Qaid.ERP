const fs = require('fs');

function fixSalesPage() {
    const file = 'src/app/sales/page.tsx';
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');

    code = code.replace(
        /remaining: number;\s*notes\?: string;\s*lines: any\[\];\s*}/,
        `remaining: number;\n    notes?: string;\n    paymentMethod?: string;\n    lines: any[];\n}`
    );

    code = code.replace(
        /const getStatusStyle = \(total: number, paid: number\) => {/,
        `const getStatusStyle = (total: number, paid: number, paymentMethod?: string) => {\n        if (paymentMethod === 'installment_plan') return { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', text: t('مُقسطة'), icon: Clock };`
    );

    code = code.replace(
        /const st = getStatusStyle\(inv\.total, inv\.paidAmount\);/g,
        `const st = getStatusStyle(inv.total, inv.paidAmount, inv.paymentMethod);`
    );

    // Also need to fetch paymentMethod in the API if we don't already?
    // Wait, the API `/api/sales` already returns the whole invoice. Let's assume it returns paymentMethod.

    fs.writeFileSync(file, code);
    console.log('Fixed', file);
}

function fixSalesDetailsPage() {
    const file = 'src/app/sales/[id]/page.tsx';
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');

    // getStatus function
    code = code.replace(
        /const getStatus = \(\) => {/,
        `const getStatus = () => {\n        if (invoice.paymentMethod === 'installment_plan') return { label: t('مُقسطة'), color: '#a78bfa', icon: Clock, bg: 'rgba(167,139,250,0.1)' };`
    );

    fs.writeFileSync(file, code);
    console.log('Fixed', file);
}

fixSalesPage();
fixSalesDetailsPage();
