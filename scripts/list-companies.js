const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({
        include: {
            users: { select: { email: true, role: true } },
            subscription: { select: { features: true } }
        }
    });

    companies.forEach(c => {
        console.log('---');
        console.log('Name:', c.name);
        console.log('BusinessType:', c.businessType);
        console.log('ID:', c.id);
        console.log('Users:', c.users.map(u => `${u.email} (${u.role})`).join(', '));
        try {
            const f = JSON.parse(c.subscription?.features || '{}');
            console.log('Features keys:', Object.keys(f).join(', '));
        } catch { console.log('Features: (parse error)'); }
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
