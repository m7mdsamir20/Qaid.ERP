const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    console.log("Starting JournalEntry backfill...");
    const entries = await prisma.journalEntry.findMany({
        where: { branchId: null },
        include: { lines: true }
    });

    console.log(`Found ${entries.length} entries without branchId.`);
    let updatedCount = 0;

    for (const entry of entries) {
        let branchId = null;

        // Try to derive branch from referenceType and referenceId
        if (entry.referenceType && entry.referenceId) {
            try {
                if (entry.referenceType === 'invoice') {
                    const inv = await prisma.invoice.findUnique({ where: { id: entry.referenceId } });
                    if (inv && inv.branchId) branchId = inv.branchId;
                } else if (entry.referenceType === 'voucher') {
                    const v = await prisma.voucher.findUnique({ where: { id: entry.referenceId } });
                    if (v && v.branchId) branchId = v.branchId;
                } else if (entry.referenceType === 'payroll') {
                    const p = await prisma.payroll.findUnique({ where: { id: entry.referenceId } });
                    if (p && p.branchId) branchId = p.branchId;
                } else if (entry.referenceType === 'purchase') {
                    const p = await prisma.invoice.findUnique({ where: { id: entry.referenceId } }); // Invoices act as purchases
                    if (p && p.branchId) branchId = p.branchId;
                } else if (entry.referenceType === 'stocktaking') {
                    const s = await prisma.stocktaking.findUnique({ where: { id: entry.referenceId } });
                    if (s && s.branchId) branchId = s.branchId;
                } else if (entry.referenceType === 'opening_balance') {
                    // check lines for treasury or something to find branch, else leave null
                }
            } catch (e) {}
        }

        if (branchId) {
            await prisma.journalEntry.update({
                where: { id: entry.id },
                data: { branchId }
            });
            updatedCount++;
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount} entries.`);
}

backfill()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
