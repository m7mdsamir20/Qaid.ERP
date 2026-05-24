const fs = require('fs');

function fixSalesRoute() {
    const file = 'src/app/api/sales/route.ts';
    let code = fs.readFileSync(file, 'utf8');

    // Add paymentMethod and notes to the select block
    code = code.replace(
        /type: true,\s*customer: \{ select: \{ id: true, name: true, balance: true \} \}/g,
        "type: true,\n                    paymentMethod: true,\n                    notes: true,\n                    customer: { select: { id: true, name: true, balance: true } }"
    );

    fs.writeFileSync(file, code);
}

function fixCancelRoute() {
    const file = 'src/app/api/installments/cancel/route.ts';
    let code = fs.readFileSync(file, 'utf8');

    // Add logic to revert invoice paymentMethod and amounts
    if (!code.includes('tx.invoice.update')) {
        code = code.replace(
            "// ③ Decrease customer balance by remaining amount",
            `// ③ Revert invoice status if linked
            if (plan.invoiceId) {
                const inv = await tx.invoice.findUnique({ where: { id: plan.invoiceId } });
                if (inv) {
                    await tx.invoice.update({
                        where: { id: plan.invoiceId },
                        data: {
                            remaining: plan.totalAmount,
                            paidAmount: { decrement: plan.totalAmount },
                            paymentMethod: 'credit',
                            notes: inv.notes?.replace(\`تمت جدولتها إلى خطة تقسيط رقم \${plan.planNumber}\`, '').trim()
                        }
                    });
                }
            }

            // ③ Decrease customer balance by remaining amount`
        );
    }
    fs.writeFileSync(file, code);
}

fixSalesRoute();
fixCancelRoute();
console.log('Fixed API routes');
