// script to fix company businessType and subscription features back to TRADING
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TRADING_FEATURES = {
    sales: ['/sales', '/sale-returns', '/receipts', '/customers', '/installments', '/quotations'],
    purchases: ['/purchases', '/purchase-returns', '/purchase-payments', '/suppliers'],
    inventory: ['/items', '/categories', '/units', '/warehouses', '/stock-movements', '/stocktakings', '/warehouse-transfers'],
    accounting: ['/accounts', '/journal-entries', '/general-ledger', '/opening-balances', '/financial-years', '/closing-entries', '/cost-centers'],
    treasury: ['/treasuries', '/expenses', '/other-income', '/payments', '/receipts'],
    hr: ['/employees', '/departments', '/payrolls', '/advances', '/deductions'],
    partners: ['/partners', '/partner-accounts', '/profit-distribution', '/settlements'],
    fixed_assets: ['/fixed-assets'],
    reports: ['/reports'],
    settings: ['/settings'],
};

async function main() {
    // Find company by user email
    const user = await prisma.user.findFirst({
        where: { email: 'm7mdsamir2000@gmail.com' },
        include: { company: { include: { subscription: true } } }
    });

    if (!user?.company) {
        console.log('Company not found');
        return;
    }

    const company = user.company;
    console.log(`Found company: ${company.name} (${company.id})`);
    console.log(`Current businessType: ${company.businessType}`);

    // Fix businessType
    await prisma.company.update({
        where: { id: company.id },
        data: { businessType: 'TRADING' }
    });
    console.log('✅ businessType updated to TRADING');

    // Fix subscription features
    if (company.subscription) {
        await prisma.subscription.update({
            where: { id: company.subscription.id },
            data: { features: JSON.stringify(TRADING_FEATURES) }
        });
        console.log('✅ subscription.features updated to TRADING modules');
    }

    // Invalidate all sessions (force re-login)
    try {
        await prisma.session.deleteMany({ where: { userId: user.id } });
        console.log('✅ Sessions cleared — user must log in again');
    } catch (e) {
        console.log('ℹ️  Could not clear sessions (may not exist in DB) — please log out manually');
    }

    console.log('\n✅ Done! User must log out and log back in.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
