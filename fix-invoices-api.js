const fs = require('fs');

function fixInstallmentsPage() {
    const file = 'src/app/installments/page.tsx';
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');

    // Fix the endpoint call
    code = code.replace(
        /fetch\('\/api\/invoices\?status=unpaid'\)/,
        `fetch('/api/sales?status=unpaid&limit=1000')`
    );

    fs.writeFileSync(file, code);
    console.log('Fixed', file);
}

function fixSalesApi() {
    const file = 'src/app/api/sales/route.ts';
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');

    // Add status filter logic
    const whereLine = "const where: any = { companyId, type: 'sale', ...branchFilter };";
    if (code.includes(whereLine)) {
        code = code.replace(
            whereLine,
            `${whereLine}\n        if (url.searchParams.get('status') === 'unpaid') {\n            where.remaining = { gt: 0 };\n            where.paymentMethod = { not: 'installment_plan' };\n        }`
        );
    }

    fs.writeFileSync(file, code);
    console.log('Fixed', file);
}

fixInstallmentsPage();
fixSalesApi();
