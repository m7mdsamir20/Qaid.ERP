import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const namesToDelete = [
        'إضافات (بمقابل)',
        'تعديلات (بدون مقابل)',
        'مستوى الطهي',
        'الأحجام',
        'نوع الخبز'
    ];

    console.log("Deleting modifiers...");
    
    const result = await prisma.modifier.deleteMany({
        where: {
            name: {
                in: namesToDelete
            }
        }
    });
    
    console.log(`Deleted ${result.count} modifiers.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
