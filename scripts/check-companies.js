const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, companyId: true },
        take: 20
    });
    console.log('All users:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
