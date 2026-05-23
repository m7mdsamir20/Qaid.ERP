const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'm7mdsamir2000@gmail.com' } // Assuming this is the active user
    });
    
    if (!user) { console.log("User not found"); return; }
    const companyId = user.companyId;

    const currentYear = await prisma.financialYear.findFirst({
        where: { companyId, isOpen: true },
        orderBy: { startDate: 'desc' }
    });

    if (!currentYear) { console.log("No open year for company", companyId); return; }

    const accounts = await prisma.account.findMany({
        where: { companyId, accountCategory: 'detail' },
        include: {
            openingBalances: {
                where: { financialYearId: currentYear.id }
            },
            journalEntryLines: {
                where: {
                    journalEntry: {
                        isPosted: true,
                        referenceType: { not: 'opening_balance' },
                        date: {
                            gte: currentYear.startDate,
                            lte: currentYear.endDate
                        }
                    }
                }
            }
        }
    });

    const report = accounts.map(acc => {
        const opDebit = acc.openingBalances.reduce((s, b) => s + b.debit, 0);
        const opCredit = acc.openingBalances.reduce((s, b) => s + b.credit, 0);
        const transDebit = acc.journalEntryLines.reduce((s, l) => s + l.debit, 0);
        const transCredit = acc.journalEntryLines.reduce((s, l) => s + l.credit, 0);
        return {
            code: acc.code,
            name: acc.name,
            totalDebit: opDebit + transDebit,
            totalCredit: opCredit + transCredit
        };
    }).filter(acc => acc.totalDebit !== 0 || acc.totalCredit !== 0);

    console.log(`Trial balance report for ${companyId} (Year: ${currentYear.name}):`, report);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
