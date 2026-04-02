import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkVouchers() {
  const pms = await prisma.voucher.findMany({
    where: { type: 'payment' },
    select: { id: true, voucherNumber: true, createdAt: true },
    orderBy: { voucherNumber: 'desc' }
  });
  console.log('--- Payment Vouchers (' + pms.length + ') ---');
  pms.forEach(v => console.log(v));
  
  const rcs = await prisma.voucher.findMany({
    where: { type: 'receipt' },
    select: { id: true, voucherNumber: true, createdAt: true },
    orderBy: { voucherNumber: 'desc' }
  });
  console.log('\n--- Receipt Vouchers (' + rcs.length + ') ---');
  rcs.forEach(v => console.log(v));
}

checkVouchers().finally(() => prisma.$disconnect());
