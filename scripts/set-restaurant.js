const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Update the first company to RESTAURANTS for testing
    const target = 'cmo2c91zx0001107mjd5uj1at'; // Mustafa Gad - change this ID if needed
    
    const updated = await prisma.company.update({
        where: { id: target },
        data: { businessType: 'RESTAURANTS' },
        select: { id: true, name: true, businessType: true }
    });
    console.log('Updated:', JSON.stringify(updated, null, 2));
}

main().finally(() => prisma.$disconnect());
