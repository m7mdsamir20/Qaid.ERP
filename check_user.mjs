import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const superadmin = await prisma.user.findFirst({
      where: { OR: [{ role: 'superadmin' }, { isSuperAdmin: true }] },
      include: { company: { include: { branches: true } } }
  });
  if (superadmin) {
      console.log('Superadmin:', superadmin.email, 'Company:', superadmin.company?.id);
      console.log('Branches:', superadmin.company?.branches.map(b => ({ id: b.id, name: b.name })));
  } else {
      console.log('No superadmin found');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
