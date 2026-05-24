const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const companyId = await prisma.company.findFirst().then(c => c?.id);
        if (!companyId) {
            console.log('No company found');
            return;
        }
        
        console.log('Testing queries for company:', companyId);
        
        const [
            company, financialYears,
            accounts, customers, suppliers,
            items, warehouses, stocks,
            invoices, journalEntries,
            treasuries, installmentPlans, employees,
        ] = await Promise.all([
            prisma.company.findUnique({ where: { id: companyId } }),
            prisma.financialYear.findMany({ where: { companyId } }),
            prisma.account.findMany({ where: { companyId } }),
            prisma.customer.findMany({ where: { companyId } }),
            prisma.supplier.findMany({ where: { companyId } }),
            prisma.item.findMany({ where: { companyId } }),
            prisma.warehouse.findMany({ where: { companyId } }),
            prisma.stock.findMany({ where: { warehouse: { companyId } } }),
            prisma.invoice.findMany({ where: { companyId }, include: { lines: true } }),
            prisma.journalEntry.findMany({ where: { companyId }, include: { lines: true } }),
            prisma.treasury.findMany({ where: { companyId } }),
            prisma.installmentPlan.findMany({ where: { companyId }, include: { installments: true } }),
            prisma.employee.findMany({ where: { companyId } }),
        ]);

        console.log('All queries passed successfully!');
        const backup = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            companyId,
            companyName: company?.name,
            data: {
                company, financialYears, accounts,
                customers, suppliers, items, warehouses, stocks,
                invoices, journalEntries,
                treasuries, installmentPlans, employees,
            },
        };
        JSON.stringify(backup);
        console.log('JSON Stringify passed!');

    } catch (e) {
        console.error('CRASH:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
