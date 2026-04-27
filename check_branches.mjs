import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const invoices = await prisma.invoice.groupBy({ by: ['branchId'], _count: true });
  console.log('Invoices by branchId:', invoices);
  const treasuries = await prisma.treasury.groupBy({ by: ['branchId'], _count: true });
  console.log('Treasuries by branchId:', treasuries);
}
main().catch(console.error).finally(() => prisma.$disconnect());
