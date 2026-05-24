const fs = require('fs');

const filePath = 'src/app/api/installments/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add type and invoiceId to destructuring
code = code.replace(
    /const {\s*customerId, productName/g,
    "const {\n            type = 'direct', invoiceId,\n            customerId, productName"
);

// 2. Add invoiceId to InstallmentPlan creation
code = code.replace(
    /status:\s*'active',\s*companyId,\s*},/g,
    "status:            'active',\n                    companyId,\n                    invoiceId:         type === 'invoice' ? invoiceId : null,\n                },"
);

// 3. Conditional customer balance increment
code = code.replace(
    /data:\s*{\s*balance:\s*{\s*increment:\s*grandTotal\s*}\s*},/g,
    "data:  { balance: { increment: type === 'invoice' ? totalInterest : grandTotal } },"
);

// 4. Update the journal entry for the plan
// We find the block: if (receivablesAcc && salesAcc) { ... }
// We want to wrap the original in `if (type === 'direct')` and add an `else if (type === 'invoice')` block.
const journalEntryBlockRegex = /if \(receivablesAcc && salesAcc\) {[\s\S]*?(?=\s*}\s*if \(!isServices && itemId && currentYear\))/;
const originalJEBlock = code.match(journalEntryBlockRegex);
if (originalJEBlock) {
    const directBlock = originalJEBlock[0].replace('if (receivablesAcc && salesAcc) {', 'if (receivablesAcc && salesAcc && type === \'direct\') {');
    const invoiceBlock = `
                if (receivablesAcc && interestAcc && type === 'invoice' && totalInterest > 0) {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where:   { companyId },
                        orderBy: { entryNumber: 'desc' },
                        select:  { entryNumber: true },
                    });
                    await tx.journalEntry.create({
                        data: {
                            // @ts-ignore
                            branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),
                            entryNumber:     (lastEntry?.entryNumber || 0) + 1,
                            date:            new Date(),
                            description:     \`إثبات فوائد خطة تقسيط رقم \${planNumber} للعميل \${(await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } }))?.name || ''}\`,
                            reference:       \`INST-\${String(planNumber).padStart(5, '0')}\`,
                            referenceType:   'installment_plan',
                            referenceId:     plan.id,
                            financialYearId: currentYear.id,
                            companyId,
                            isPosted:        true,
                            lines: {
                                create: [
                                    {
                                        accountId:   receivablesAcc.id,
                                        debit:       totalInterest,
                                        credit:      0,
                                        description: \`فوائد عقد تقسيط رقم \${planNumber}\`,
                                    },
                                    {
                                        accountId:   interestAcc.id,
                                        debit:       0,
                                        credit:      totalInterest,
                                        description: \`إيرادات فوائد تقسيط رقم \${planNumber}\`,
                                    },
                                ],
                            },
                        },
                    });
                }
`;
    code = code.replace(journalEntryBlockRegex, directBlock + invoiceBlock);
}

// 5. Condition COGS logic
code = code.replace(
    /if \(!isServices && itemId && currentYear\) {/g,
    "if (!isServices && itemId && currentYear && type === 'direct') {"
);

// 6. At the very end of the transaction (before returning plan), if type === 'invoice', we update the invoice status.
const returnPlanRegex = /return plan;\s*}\);/g;
const invoiceUpdateLogic = `
            if (type === 'invoice' && invoiceId) {
                const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
                if (inv) {
                    await tx.invoice.update({
                        where: { id: invoiceId },
                        data: {
                            remaining: 0,
                            paidAmount: { increment: inv.remaining }, // close the invoice completely
                            paymentMethod: 'installment_plan',
                            notes: (inv.notes ? inv.notes + '\\n' : '') + \`تمت جدولتها إلى خطة تقسيط رقم \${planNumber}\`
                        }
                    });
                }
            }

            return plan;
        });`;
code = code.replace(returnPlanRegex, invoiceUpdateLogic);

// 7. In DELETE route, we need to revert the invoice if there's an invoiceId
const revertCustomerBalanceRegex = /const netBalance = plan\.grandTotal - plan\.downPayment;\s*if \(netBalance > 0\) {\s*await tx\.customer\.update\([\s\S]*?\);\s*}/;
const revertLogicStr = code.match(revertCustomerBalanceRegex);

if (revertLogicStr) {
    const modifiedRevert = `
            // ① عكس رصيد العميل (grandTotal المضاف عند الإنشاء - المقدم المطروح)
            // إذا كانت الخطة مرتبطة بفاتورة، فالمضاف للرصيد كان فقط الفائدة
            const addedToBalance = plan.invoiceId ? plan.totalInterest : plan.grandTotal;
            const netBalance = addedToBalance - plan.downPayment;
            if (netBalance > 0) {
                await tx.customer.update({
                    where: { id: plan.customerId },
                    data: { balance: { decrement: netBalance } },
                });
            }

            // إرجاع حالة الفاتورة إذا كانت مرتبطة
            if (plan.invoiceId) {
                const inv = await tx.invoice.findUnique({ where: { id: plan.invoiceId } });
                if (inv) {
                    // We must deduct the principal (totalAmount) from paidAmount and add to remaining
                    await tx.invoice.update({
                        where: { id: plan.invoiceId },
                        data: {
                            remaining: plan.totalAmount,
                            paidAmount: { decrement: plan.totalAmount },
                            paymentMethod: 'credit', // revert to credit
                            notes: inv.notes?.replace(\`تمت جدولتها إلى خطة تقسيط رقم \${plan.planNumber}\`, '').trim()
                        }
                    });
                }
            }
`;
    code = code.replace(revertCustomerBalanceRegex, modifiedRevert);
}

// Disable stock revert for invoice-linked plans
code = code.replace(
    /const outMovements = await tx\.stockMovement\.findMany/g,
    "if (!plan.invoiceId) {\n                const outMovements = await tx.stockMovement.findMany"
);
code = code.replace(
    /await tx\.stockMovement\.create\({\s*data: {\s*type: 'in'[\s\S]*?}\s*}\);\s*}/g,
    "await tx.stockMovement.create({\n                    data: {\n                        type: 'in', date: new Date(),\n                        itemId: mv.itemId, warehouseId: mv.warehouseId,\n                        quantity: mv.quantity,\n                        reference: `INST-${plan.planNumber}`,\n                        notes: `عكس بيع تقسيط - حذف خطة #${plan.planNumber}`,\n                        companyId,\n                    }\n                });\n            }\n            }"
);

fs.writeFileSync(filePath, code);
console.log("Installments API updated successfully.");
