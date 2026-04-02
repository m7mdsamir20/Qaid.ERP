const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('--- Starting Voucher Re-Sequencing ---');
    const types = ['payment', 'receipt'];
    for (const type of types) {
        const vs = await prisma.voucher.findMany({ 
            where: { type }, 
            orderBy: { createdAt: 'asc' } 
        });
        console.log(`Fixing ${vs.length} ${type} vouchers...`);
        for (let i = 0; i < vs.length; i++) {
            await prisma.voucher.update({ 
                where: { id: vs[i].id }, 
                data: { voucherNumber: i + 1 } 
            });
        }
    }
    console.log('--- Re-Sequencing Done ---');
    process.exit(0);
}

fix().catch(e => {
    console.error(e);
    process.exit(1);
});
