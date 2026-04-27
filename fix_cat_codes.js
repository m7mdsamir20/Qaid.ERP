const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCategoryCodes() {
    const categories = await prisma.category.findMany({
        where: { code: null }
    });

    for (const cat of categories) {
        const lastCategory = await prisma.category.findFirst({
            where: { companyId: cat.companyId, code: { startsWith: 'CAT-' } },
            orderBy: { code: 'desc' }
        });

        let nextNum = 1;
        if (lastCategory?.code) {
            const match = lastCategory.code.match(/CAT-(\d+)/);
            if (match) nextNum = parseInt(match[1]) + 1;
        }

        const newCode = `CAT-${String(nextNum).padStart(3, '0')}`;
        await prisma.category.update({
            where: { id: cat.id },
            data: { code: newCode }
        });
        console.log(`Updated category ${cat.name} to ${newCode}`);
    }
    console.log('Done!');
}

fixCategoryCodes()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
