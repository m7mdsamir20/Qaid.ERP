import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const item = await prisma.item.create({
            data: {
                code: 'TEST-' + Date.now(),
                name: 'Test Item',
                companyId: 'cm2wusyps0000z61o812aodst', // Hardcoded companyId from previous output
                costPrice: 0,
                sellPrice: 150,
                type: 'product',
                isPosEligible: true,
            }
        });
        console.log("Success:", item);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
