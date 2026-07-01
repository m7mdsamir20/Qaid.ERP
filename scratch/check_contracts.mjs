import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const contracts = await p.serviceContract.findMany({
    where: { companyId: 'cmr1qenbg0001cthbafhotvoo' },
    select: { id: true, contractNumber: true, status: true, customerId: true }
});
console.log('Service contracts:', JSON.stringify(contracts, null, 2));
await p.$disconnect();
