import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmod1lme7000186tek84z57c6';
    const sub = await prisma.subscription.findUnique({
        where: { companyId }
    });
    console.log("Subscription:", JSON.stringify(sub, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
