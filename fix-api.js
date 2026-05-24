const fs = require('fs');

const file = 'src/app/api/installments/route.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/subTotal: total,/, 'subtotal: total,');
code = code.replace(/referenceType: 'sale',/g, '');
code = code.replace(/referenceId: invoice\.id,/, 'reference: invoice.id,');
code = code.replace(/principalAmount:   principalAmt,/, 'principal:   principalAmt,');
code = code.replace(/interestAmount:    interestAmt,/, 'interest:    interestAmt,');
code = code.replace(/status:            'unpaid',/, "status:            'unpaid',\n                    companyId,");
code = code.replace(/referenceId: plan\.invoiceId/g, 'reference: plan.invoiceId');

fs.writeFileSync(file, code);
console.log('API syntax fixed');
