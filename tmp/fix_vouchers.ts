import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixVouchers() {
  console.log('--- Fixing Payment Vouchers ---');
  const pms = await prisma.voucher.findMany({
    where: { type: 'payment' },
    orderBy: { createdAt: 'asc' }
  });

  for (let i = 0; i < pms.length; i++) {
    const v = pms[i];
    const newNum = i + 1;
    console.log(`Updating Payment ID ${v.id}: ${v.voucherNumber} -> ${newNum}`);
    await prisma.voucher.update({
      where: { id: v.id },
      data: { voucherNumber: newNum }
    });
  }

  console.log('\n--- Fixing Receipt Vouchers ---');
  const rcs = await prisma.voucher.findMany({
    where: { type: 'receipt' },
    orderBy: { createdAt: 'asc' }
  });

  for (let i = 0; i < rcs.length; i++) {
    const v = rcs[i];
    const newNum = i + 1;
    console.log(`Updating Receipt ID ${v.id}: ${v.voucherNumber} -> ${newNum}`);
    await prisma.voucher.update({
      where: { id: v.id },
      data: { voucherNumber: newNum }
    });
  }

  console.log('\nDone.');
}

fixVouchers().catch(console.error).finally(() => prisma.$disconnect());
