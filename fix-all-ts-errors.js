const fs = require('fs');

function fixAPI() {
    const file = 'src/app/api/installments/route.ts';
    let code = fs.readFileSync(file, 'utf8');

    // 1. discountType -> discount
    code = code.replace(/discountType: 'percentage',/g, '');
    code = code.replace(/discountValue: 0,/g, 'discount: 0,');

    // 2. StockMovement missing date, warehouseId
    // And remove duplicate reference
    // Replace:
    // await tx.stockMovement.create({
    //     data: {
    //         itemId: dbItem.id,
    //         type: 'out',
    //         quantity: item.quantity,
    //         reference: `فاتورة تقسيط ${invNum}`,
    //         reference: invoice.id,
    //         companyId,
    //     }
    // });
    // with date: new Date(), warehouseId: stocks[0]?.warehouseId || ''
    
    // First, let's just match the StockMovement creation inside the POST method
    code = code.replace(/await tx\.stockMovement\.create\(\{[\s\S]*?companyId,\s*\}\s*\}\);/g, (match) => {
        if (match.includes("فاتورة تقسيط")) {
            return `const warehouse = await tx.warehouse.findFirst({ where: { companyId } });
                        await tx.stockMovement.create({
                            data: {
                                itemId: dbItem.id,
                                type: 'out',
                                quantity: item.quantity,
                                reference: invoice.id,
                                date: new Date(),
                                warehouseId: warehouse?.id || '',
                                companyId,
                            }
                        });`;
        }
        return match;
    });

    fs.writeFileSync(file, code);
}

function fixPage() {
    const file = 'src/app/installments/page.tsx';
    let code = fs.readFileSync(file, 'utf8');

    // Fix tuple
    code = code.replace(/const \[pRes, cRes, tRes, iRes, invRes\] = await Promise\.all\(\[/, 'const [pRes, cRes, tRes, iRes] = await Promise.all([');
    
    // Remove leftover planType logic
    code = code.replace(/\{planType === 'direct' \? \(/g, '');
    code = code.replace(/\) : \([\s\S]*?اختر الفاتورة الآجلة[\s\S]*?<\/div>\s*\)/g, '');

    // Sometimes planType is used in ternary: `planType === 'direct' ? ... : ...`
    code = code.replace(/disabled=\{planType === 'invoice'\}/g, 'disabled');

    // There might be some unpaidInvoices usages left inside `onSelectItem` or `onChange`?
    // The errors were on line 539: unpaidInvoices
    // It seems the `) : (` block was not successfully removed because of my regex!
    // Let me just manually remove the `) : (` block. I'll search for `unpaidInvoices` and remove the whole chunk.
    const parts = code.split(') : (');
    if (parts.length > 1) {
        // Find where the 'direct' branch started to clean it up properly, but it's easier to just find the select for invoice
        // Actually, just regex the exact text:
        code = code.replace(/\) : \(\s*<div style=\{\{ gridColumn: 'span 2' \}\}>\s*<label[\s\S]*?<\/div>\s*\)/, '');
    }

    // Try to remove setPlanType buttons again if they are still there (line 445, 448)
    code = code.replace(/<div[^>]*onClick=\{\(\) => setPlanType\('direct'\)\}[^>]*>[\s\S]*?<\/div>/g, '');
    code = code.replace(/<div[^>]*onClick=\{\(\) => setPlanType\('invoice'\)\}[^>]*>[\s\S]*?<\/div>/g, '');

    fs.writeFileSync(file, code);
}

fixAPI();
fixPage();
console.log('All TS errors fixed');
