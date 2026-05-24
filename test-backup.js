const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBackup() {
    try {
        const companyId = await prisma.company.findFirst().then(c => c?.id);
        if (!companyId) {
            console.log('No company found');
            return;
        }

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

        const backup = {
            company, financialYears, accounts, customers, suppliers,
            items, warehouses, stocks, invoices, journalEntries,
            treasuries, installmentPlans, employees
        };

        const json = JSON.stringify(backup);
        console.log('JSON size:', json.length);
        console.log('Success');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

testBackup();
