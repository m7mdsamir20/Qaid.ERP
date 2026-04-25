const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trialFeatures = JSON.stringify(['pos', 'tables', 'kitchen', 'sales', 'inventory', 'reports']);
    
    await prisma.company.updateMany({
        where: { businessType: 'RESTAURANTS' },
        data: { activeModules: trialFeatures }
    });
    
    const companies = await prisma.company.findMany({
        where: { businessType: 'RESTAURANTS' },
        select: { id: true }
    });
    
    for (const c of companies) {
        await prisma.subscription.updateMany({
            where: { companyId: c.id, plan: 'trial' },
            data: { features: trialFeatures }
        });
    }
    
    console.log('Successfully updated existing RESTAURANT accounts to correct trial features!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
