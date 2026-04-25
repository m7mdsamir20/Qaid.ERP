const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({
        select: { id: true, name: true, businessType: true }
    });
    console.log('Companies:', JSON.stringify(companies, null, 2));
}

main().finally(() => prisma.$disconnect());
