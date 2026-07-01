import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// List all users with their companies
const users = await p.user.findMany({
    select: { id: true, username: true, name: true, companyId: true, role: true, isSuperAdmin: true },
    orderBy: { createdAt: 'desc' }
});
console.log('All users:', JSON.stringify(users, null, 2));

// Also list companies with businessType
const companies = await p.company.findMany({
    select: { id: true, name: true, businessType: true },
    orderBy: { createdAt: 'desc' }
});
console.log('\nAll companies:', JSON.stringify(companies, null, 2));

await p.$disconnect();
