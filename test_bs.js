const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'm7mdsamir2000@gmail.com' } // Assuming this is the active user
    });
    
    if (!user) { console.log("User not found"); return; }
    const companyId = user.companyId;

    const openYear = await prisma.financialYear.findFirst({
        where: { companyId, isOpen: true },
    });

    let yearFilter = {};
    if (openYear) yearFilter = { financialYearId: openYear.id };

    const openingBalances = await prisma.openingBalance.findMany({
        where: { companyId, ...(yearFilter.financialYearId ? { financialYearId: yearFilter.financialYearId } : {}) },
        include: { account: true }
    });

    const lines = await prisma.journalEntryLine.findMany({
        where: {
            journalEntry: { 
                companyId, 
                isPosted: true, 
                ...yearFilter,
                OR: [
                    { referenceType: { not: 'opening_balance' } },
                    { referenceType: null }
                ]
            },
            account: {
                type: { in: ['asset', 'liability', 'equity', 'revenue', 'expense'] }
            }
        },
        include: { account: true }
    });

    const accountsMap = new Map();
    let netIncome = 0;

    for (const ob of openingBalances) {
        const accId = ob.accountId;
        if (!accountsMap.has(accId)) {
            accountsMap.set(accId, { code: ob.account.code, name: ob.account.name, type: ob.account.type, balance: 0 });
        }
        const current = accountsMap.get(accId);
        if (ob.account.type === 'asset') current.balance += (ob.debit - ob.credit);
        else if (ob.account.type === 'liability' || ob.account.type === 'equity') current.balance += (ob.credit - ob.debit);
    }

    for (const line of lines) {
        const accId = line.accountId;
        if (!accountsMap.has(accId)) {
            accountsMap.set(accId, { code: line.account.code, name: line.account.name, type: line.account.type, balance: 0 });
        }
        const current = accountsMap.get(accId);

        if (current.type === 'asset') current.balance += (line.debit - line.credit);
        else if (current.type === 'liability' || current.type === 'equity') current.balance += (line.credit - line.debit);
        else if (current.type === 'revenue') netIncome += (line.credit - line.debit);
        else if (current.type === 'expense') netIncome -= (line.debit - line.credit);
    }

    const rawReport = Array.from(accountsMap.values());
    const assets = rawReport.filter(a => a.type === 'asset' && a.balance !== 0);
    const liabilities = rawReport.filter(a => a.type === 'liability' && a.balance !== 0);

    console.log("Balance Sheet Assets:", assets);
    console.log("Balance Sheet Liabilities:", liabilities);
    console.log("Net Income:", netIncome);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
