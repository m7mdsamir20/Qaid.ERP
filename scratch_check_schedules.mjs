import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmohjkq670001t1zqmn59hnom';
    const schedules = await prisma.workSchedule.findMany({
        where: { companyId }
    });
    console.log("Schedules:", JSON.stringify(schedules, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
