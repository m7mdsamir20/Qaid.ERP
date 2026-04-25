const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find Mohamed Samir by partial email or name
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { contains: 'm7mdsamir' } },
                { email: { contains: 'samir' } },
                { name: { contains: 'Mohamed' } },
                { name: { contains: 'Samir' } },
                { name: { contains: 'محمد سمير' } },
            ]
        },
        select: { id: true, name: true, email: true, companyId: true, company: { select: { id: true, name: true, businessType: true } } }
    });
    
    console.log('Found user:', JSON.stringify(user, null, 2));

    if (user?.companyId) {
        const updated = await prisma.company.update({
            where: { id: user.companyId },
            data: { businessType: 'RESTAURANTS' },
            select: { id: true, name: true, businessType: true }
        });
        console.log('✅ Updated to RESTAURANTS:', JSON.stringify(updated, null, 2));
        console.log('\n👉 الآن سجّل خروج وادخل تاني بنفس الحساب على localhost:3000');
    } else {
        console.log('❌ User not found - listing all users:');
        const all = await prisma.user.findMany({ select: { name: true, email: true, companyId: true } });
        console.log(JSON.stringify(all, null, 2));
    }
}

main().finally(() => prisma.$disconnect());
