import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const companies = await p.company.findMany();
console.log(JSON.stringify(companies.map(c => ({
    id: c.id,
    name: c.name,
    taxNumber: c.taxNumber,
    commercialRegister: c.commercialRegister,
    countryCode: c.countryCode
})), null, 2));
await p.$disconnect();
