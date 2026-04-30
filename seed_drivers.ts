import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { name: 'سكول' } });
    if (!company) {
        console.log("Company 'سكول' not found. Exiting.");
        return;
    }

    console.log(`Seeding Drivers for company: ${company.name}`);

    const driversData = [
        { name: 'أحمد محمد', phone: '0501234567', status: 'available' },
        { name: 'محمود سعيد', phone: '0559876543', status: 'busy' },
        { name: 'كريم حسن', phone: '0541122334', status: 'available' },
        { name: 'فيصل العتيبي', phone: '0599988776', status: 'offline' },
    ];

    for (const d of driversData) {
        const created = await prisma.driver.create({
            data: {
                name: d.name,
                phone: d.phone,
                status: d.status,
                companyId: company.id
            }
        });
        console.log(`  Created Driver: ${created.name} (${created.phone})`);
    }
    
    console.log("Seeding drivers completed successfully!");
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
