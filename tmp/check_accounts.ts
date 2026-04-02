import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany();
  console.log('Total accounts in DB:', accounts.length);
  if (accounts.length > 0) {
    console.log('First account:', JSON.stringify(accounts[0], null, 2));
    const companies = await prisma.company.findMany();
    console.log('Total companies:', companies.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
