import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({ where: { name: 'سكول' } });
    if (!company) {
        console.log("Company 'سكول' not found. Exiting.");
        return;
    }

    console.log(`Seeding Modifiers for company: ${company.name}`);

    // Clean up previous seeded modifiers
    await prisma.modifier.deleteMany({
        where: {
            companyId: company.id,
            name: {
                in: ['إضافات (بمقابل)', 'تعديلات (بدون مقابل)', 'مستوى الطهي', 'نوع الخبز', 'إضافات الجبن والخضار', 'إزالة مكونات']
            }
        }
    });

    // Fetch inventory items to link
    const items = await prisma.item.findMany({ where: { companyId: company.id } });
    const getItem = (name: string) => items.find(i => i.name === name);

    const cheese = getItem('جبن شيدر');
    const olives = getItem('زيتون');
    const pepper = getItem('فلفل رومي');
    const potato = getItem('بطاطس');
    const burger = getItem('لحم برجر');
    
    // We will not link "بدون" because it would deduct from inventory if added, which is wrong.
    
    const modifiersData = [
        {
            name: 'إضافات بمقابل (مربوطة بالمخزن)',
            multiSelect: true,
            options: [
                { name: 'إكسترا جبنة شيدر', extraPrice: 3, itemId: cheese?.id || null },
                { name: 'زيتون زيادة', extraPrice: 2, itemId: olives?.id || null },
                { name: 'فلفل رومي زيادة', extraPrice: 2, itemId: pepper?.id || null },
                { name: 'شريحة لحم برجر إضافية', extraPrice: 8, itemId: burger?.id || null },
                { name: 'إضافة بطاطس', extraPrice: 5, itemId: potato?.id || null },
            ]
        },
        {
            name: 'إزالة مكونات (بدون مقابل)',
            multiSelect: true,
            options: [
                { name: 'بدون بصل', extraPrice: 0, itemId: null },
                { name: 'بدون طماطم', extraPrice: 0, itemId: null },
                { name: 'بدون خس', extraPrice: 0, itemId: null },
            ]
        },
        {
            name: 'مستوى الطهي',
            multiSelect: false,
            options: [
                { name: 'نصف استواء (Medium Rare)', extraPrice: 0, itemId: null },
                { name: 'استواء وسط (Medium)', extraPrice: 0, itemId: null },
                { name: 'مطهو جيداً (Well Done)', extraPrice: 0, itemId: null },
            ]
        }
    ];

    for (const mod of modifiersData) {
        const created = await prisma.modifier.create({
            data: {
                name: mod.name,
                multiSelect: mod.multiSelect,
                companyId: company.id,
                options: {
                    create: mod.options.map(opt => ({
                        name: opt.name,
                        extraPrice: opt.extraPrice,
                        itemId: opt.itemId
                    }))
                }
            }
        });
        console.log(`  Created Modifier: ${created.name}`);
    }
    
    console.log("Seeding completed successfully!");
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
